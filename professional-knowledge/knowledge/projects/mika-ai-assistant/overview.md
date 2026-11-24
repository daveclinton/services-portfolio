---
type: project-overview
slug: mika-ai-assistant
name: Mika AI Assistant
problem: |
  Staff needed answers from company records without writing queries or searching several screens, and without seeing data they are not allowed to see.
context: |
  Part of the main back-end system and staff web application at Mika. It is in production.
skills:
  - slug: ai-integration
    name: AI product integration
    category: engineering
  - slug: full-stack-development
    name: Full-stack development
    category: engineering
  - slug: sap-business-one-integration
    name: SAP Business One integration
    category: engineering
technologies:
  - slug: django
    name: Django 5 / Django REST Framework
    category: web framework
  - slug: openai
    name: OpenAI API
    category: AI integration
  - slug: gemini
    name: Gemini API
    category: AI integration
  - slug: nextjs
    name: Next.js 16
    category: web framework
  - slug: sap-hana
    name: SAP HANA
    category: database
---

Built an AI assistant that staff use to look up live company data. It runs every
lookup as the signed-in person, so each person sees only what they are allowed
to see. It can suggest a change, but the change is sent only after the person
presses Approve, once, before it expires, and with that person's permissions.

If an answer contains figures and nothing was looked up, an automatic check asks
the model to look them up before it answers. Answers that use SAP lookups end
with a source line that states what was counted and when. Internal record
numbers are removed before anyone sees the answer.

The assistant works with OpenAI and Gemini models, limits how many lookups each
answer may use, streams its replies, and can present answers as tables, charts,
forms and maps. Automated tests cover permissions, approvals, grounding and
streaming.
