import { generateText, jsonSchema, Output } from "ai"
import { openai } from "@ai-sdk/openai"

import {
  classifyQuestion,
  intentByName,
  INTENT_NAMES,
  type IntentName,
  type QuestionIntent,
} from "./intent"

export const INTENT_MODEL = process.env.OPENAI_INTENT_MODEL?.trim() || "gpt-4o-mini"

export type IntentSource = "rules" | "model" | "fallback"

export type ResponseMode = "answer" | "fit_assessment" | "clarify"

export interface ResponsePlan {
  subject: "candidate" | "other" | "unclear"
  goal: "learn" | "evaluate_fit" | "compare" | "pricing" | "contact" | "other"
  requirements: string[]
  missingInformation: string[]
  retrievalQueries: string[]
  responseMode: ResponseMode
}

export interface IntentDecision {
  intent: QuestionIntent
  source: IntentSource
  confidence: number
  plan: ResponsePlan
}

interface ClassifiedIntent {
  intent: IntentName
  confidence: number
  subject: ResponsePlan["subject"]
  goal: ResponsePlan["goal"]
  requirements: string[]
  missing_information: string[]
  retrieval_queries: string[]
  response_mode: ResponseMode
}

const intentSchema = jsonSchema<ClassifiedIntent>({
  type: "object",
  additionalProperties: false,
  required: [
    "intent",
    "confidence",
    "subject",
    "goal",
    "requirements",
    "missing_information",
    "retrieval_queries",
    "response_mode",
  ],
  properties: {
    intent: { type: "string", enum: [...INTENT_NAMES] },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    subject: { type: "string", enum: ["candidate", "other", "unclear"] },
    goal: {
      type: "string",
      enum: ["learn", "evaluate_fit", "compare", "pricing", "contact", "other"],
    },
    requirements: { type: "array", items: { type: "string" }, maxItems: 8 },
    missing_information: { type: "array", items: { type: "string" }, maxItems: 5 },
    retrieval_queries: {
      type: "array",
      items: { type: "string" },
      minItems: 1,
      maxItems: 4,
    },
    response_mode: {
      type: "string",
      enum: ["answer", "fit_assessment", "clarify"],
    },
  },
})

const CLASSIFIER_PROMPT = `Plan retrieval and response behavior for a software engineer's portfolio assistant.

Resolve the current message using the recent conversation. Pronouns such as "he",
"him", and "his" normally refer to the candidate. Return 1-4 standalone retrieval
queries that search for evidence, not an answer. For suitability questions, search
for demonstrated capabilities, relevant projects, and outcomes. Never treat a
candidate-focused question as out of scope merely because role requirements are missing.

Choose one coarse intent only as a retrieval and reranking hint:
- biography: who the engineer is or what they do overall
- rates: price, rate, compensation, cost, or availability for paid work
- experience: employers, roles, responsibilities, career history, or work background
- projects: named or representative products, systems, or things built
- skills: demonstrated abilities, strengths, suitability, or whether they can do something
- technologies: specific languages, frameworks, databases, platforms, or tools
- outcomes: results, impact, metrics, improvements, scale, or operational effects
- general: anything else or a question too unclear to place reliably

Response modes:
- answer: enough context exists for a grounded factual answer
- fit_assessment: assess demonstrated suitability without making a hiring decision
- clarify: useful evidence can be summarized, but a focused answer needs missing criteria

Classify the actual goal rather than matching one word. "Can David use Power BI?"
is skills, while "Which data tools has David used?" is technologies. "Should I hire
him?" is skills + evaluate_fit + fit_assessment, and the missing job description
belongs in missing_information. Do not answer the question.`

function isIntentName(value: unknown): value is IntentName {
  return typeof value === "string" && (INTENT_NAMES as readonly string[]).includes(value)
}

export async function classifyQuestionHybrid(
  question: string,
  history: ReadonlyArray<{ role: "user" | "assistant"; content: string }> = [],
): Promise<IntentDecision> {
  const ruleIntent = classifyQuestion(question)
  const fallbackPlan: ResponsePlan = {
    subject: "candidate",
    goal: ruleIntent.name === "rates" ? "pricing" : "learn",
    requirements: [],
    missingInformation: [],
    retrievalQueries: [question],
    responseMode: "answer",
  }

  if (!process.env.OPENAI_API_KEY?.trim()) {
    return { intent: ruleIntent, source: "fallback", confidence: 0, plan: fallbackPlan }
  }

  const recentContext = history
    .slice(-4)
    .map((turn) => `${turn.role}: ${turn.content}`)
    .join("\n")
  const prompt = recentContext
    ? `Recent conversation:\n${recentContext}\n\nCurrent question: ${question}`
    : `Current question: ${question}`

  try {
    const { output } = await generateText({
      model: openai(INTENT_MODEL),
      instructions: CLASSIFIER_PROMPT,
      prompt,
      output: Output.object({ schema: intentSchema, name: "portfolio_question_intent" }),
      temperature: 0,
      maxOutputTokens: 350,
    })
    if (
      !output ||
      !isIntentName(output.intent) ||
      typeof output.confidence !== "number" ||
      !Number.isFinite(output.confidence) ||
      !Array.isArray(output.retrieval_queries) ||
      output.retrieval_queries.length === 0
    ) {
      throw new Error("the classifier returned an invalid intent")
    }
    const confidence = Math.max(0, Math.min(1, output.confidence))
    const retrievalQueries = [...new Set(output.retrieval_queries.map((value) => value.trim()))]
      .filter(Boolean)
      .slice(0, 4)
    const plan: ResponsePlan = {
      subject: output.subject,
      goal: output.goal,
      requirements: output.requirements.map((value) => value.trim()).filter(Boolean),
      missingInformation: output.missing_information
        .map((value) => value.trim())
        .filter(Boolean),
      retrievalQueries: retrievalQueries.length > 0 ? retrievalQueries : [question],
      responseMode: output.response_mode,
    }
    return {
      intent: confidence >= 0.5 ? intentByName(output.intent) : ruleIntent,
      source: "model",
      confidence,
      plan,
    }
  } catch (error) {
    console.error("Intent classification failed; using general retrieval", error)
    return { intent: ruleIntent, source: "fallback", confidence: 0, plan: fallbackPlan }
  }
}
