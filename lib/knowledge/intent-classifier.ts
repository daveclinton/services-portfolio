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

export interface IntentDecision {
  intent: QuestionIntent
  source: IntentSource
  confidence: number
}

interface ClassifiedIntent {
  intent: IntentName
  confidence: number
}

const intentSchema = jsonSchema<ClassifiedIntent>({
  type: "object",
  additionalProperties: false,
  required: ["intent", "confidence"],
  properties: {
    intent: { type: "string", enum: [...INTENT_NAMES] },
    confidence: { type: "number", minimum: 0, maximum: 1 },
  },
})

const CLASSIFIER_PROMPT = `Classify a question asked of a software engineer's portfolio assistant.

Choose exactly one intent:
- biography: who the engineer is or what they do overall
- rates: price, rate, compensation, cost, or availability for paid work
- experience: employers, roles, responsibilities, career history, or work background
- projects: named or representative products, systems, or things built
- skills: demonstrated abilities, strengths, suitability, or whether they can do something
- technologies: specific languages, frameworks, databases, platforms, or tools
- outcomes: results, impact, metrics, improvements, scale, or operational effects
- general: anything else or a question too unclear to place reliably

Classify the user's actual goal rather than matching a single word. For example,
"Can David use Power BI?" is skills, while "Which data tools has David used?" is technologies.
Do not answer the question.`

function isIntentName(value: unknown): value is IntentName {
  return typeof value === "string" && (INTENT_NAMES as readonly string[]).includes(value)
}

/** Use rules for explicit wording and a small structured-output model for ambiguity. */
export async function classifyQuestionHybrid(
  question: string,
  history: ReadonlyArray<{ role: "user" | "assistant"; content: string }> = [],
): Promise<IntentDecision> {
  const ruleIntent = classifyQuestion(question)
  if (ruleIntent.name !== "general") {
    return { intent: ruleIntent, source: "rules", confidence: 1 }
  }

  if (!process.env.OPENAI_API_KEY?.trim()) {
    return { intent: ruleIntent, source: "fallback", confidence: 0 }
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
      maxOutputTokens: 80,
    })
    if (
      !output ||
      !isIntentName(output.intent) ||
      typeof output.confidence !== "number" ||
      !Number.isFinite(output.confidence)
    ) {
      throw new Error("the classifier returned an invalid intent")
    }
    const confidence = Math.max(0, Math.min(1, output.confidence))
    if (confidence < 0.65) {
      return { intent: ruleIntent, source: "fallback", confidence }
    }
    return { intent: intentByName(output.intent), source: "model", confidence }
  } catch (error) {
    console.error("Intent classification failed; using general retrieval", error)
    return { intent: ruleIntent, source: "fallback", confidence: 0 }
  }
}
