// Six bounded answers leave room for labels within the existing chat request limits.
export const PROJECT_SCOPE_ANSWER_LIMIT = 1_000

export const projectScopeQuestions = [
  {
    label: "What problem should this project solve?",
    hint: "Describe what happens today and what you would like to change.",
    placeholder: "Our warehouse team spends hours looking up order information…",
    required: true,
  },
  {
    label: "Who will use it?",
    hint: "Think about the people using it, their roles, and roughly how many there are.",
    placeholder: "Warehouse staff and customer support, around 30 people…",
    required: false,
  },
  {
    label: "Which systems does it need to work with?",
    hint: "Name existing apps, services, or processes. It is fine if you do not know yet.",
    placeholder: "SAP Business One, our online store, and email…",
    required: false,
  },
  {
    label: "What information will it need?",
    hint: "Describe the data and who may access it. Do not paste confidential information or credentials.",
    placeholder: "Order records and product manuals; staff should only see their own branch…",
    required: false,
  },
  {
    label: "What constraints should we plan around?",
    hint: "Share any budget range, target date, hosting needs, or other limits. These are your preferences, not a quote.",
    placeholder: "A small pilot first, ideally this quarter. Budget still to be agreed…",
    required: false,
  },
  {
    label: "What would a successful first release achieve?",
    hint: "Describe the smallest useful result and how you would know it is working.",
    placeholder: "Staff can find an order's status without asking a manager…",
    required: false,
  },
] as const

export function buildProjectScopeRequest(answers: readonly string[]): string {
  if (answers.length !== projectScopeQuestions.length) throw new Error("Please review all six project questions.")
  const sections = projectScopeQuestions.map((question, index) => {
    const answer = answers[index].trim()
    if (question.required && !answer) throw new Error("Please describe the problem you want to solve.")
    if ([...answer].length > PROJECT_SCOPE_ANSWER_LIMIT) throw new Error("Please shorten each answer before generating your brief.")
    return `${question.label}\n${answer || "Not provided — clarify before agreeing scope."}`
  })
  return `Help scope a potential project with David. These are my discovery answers:\n\n${sections.join("\n\n")}`
}
