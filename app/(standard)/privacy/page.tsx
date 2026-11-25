import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Privacy",
  description: "How email subscriptions and Ask AI handle the information you choose to share.",
  alternates: { canonical: "/privacy" },
}

export default function PrivacyPage() {
  return (
    <article>
      <header className="page-header">
        <h1>Your privacy</h1>
        <p>
          How email notes and <Link href="/ask-ai">Ask AI</Link> handle what you choose to share.
        </p>
      </header>

      <div className="blog-prose">
        <section>
          <h2>Email notes</h2>
          <p>When you choose Keep me posted, the portfolio checks your subscription status in its own database and, when needed, sends a confirmation email through Sendy. Existing newsletter members do not receive another confirmation, and signup preserves opt-out and blocked-email preferences. You join the newsletter list after confirming. This consent is separate from Ask AI conversation storage.</p>
          <p>The portfolio stores the subscriber list, confirmation records, and unsubscribe status in its own PostgreSQL database. Sendy receives your address and email content to deliver messages and manage delivery-related suppression. Your address is used for occasional notes from David. Each newsletter includes an unsubscribe link. Unsubscribing stops future newsletters; an opt-out record remains in the portfolio database to respect that choice.</p>
          <p>The signup endpoint uses temporary, hashed network and email identifiers to limit repeated requests. Email addresses are not added to conversation records or application request logs. For an access or deletion request, use the contact link on the homepage.</p>
        </section>
        <section>
          <h2>Conversation storage and consent</h2>
          <p>
            To use Ask AI, you must select the consent checkbox before sending a question. Your
            questions and the assistant&apos;s responses are then stored for 30 days so I can review
            answer quality and improve the feature. You can choose not to use Ask AI if you do not
            want the conversation stored.
          </p>
          <p>
            Interactive answer views, selected projects, and saved brief edits are kept in this
            browser tab. When you send a follow-up, the selected context or reviewed brief is
            included with your question, processed by the assistant, and stored under the same
            30-day policy. Unsaved edits are not included. Clear context stops including that
            selection in future questions; it does not delete questions already stored.
          </p>
        </section>

        <section>
          <h2>Technical information</h2>
          <p>
            Stored records include a random conversation identifier, timestamps, response
            status, broad device type, browser family, and operating-system family. The raw IP
            address and complete browser user-agent string are not stored. A one-way network hash
            that changes each day is retained for short-term abuse and quality analysis.
          </p>
        </section>

        <section>
          <h2>Service providers</h2>
          <p>
            Conversation text is processed by OpenAI to generate the assistant&apos;s response. A short question and answer preview
            may be sent through Sendy in a private notification when a successful conversation
            indicates hiring, pricing, or contact interest. Greetings, ordinary browsing, and
            unsuccessful responses do not trigger these notifications under the default policy. These
            services process the conversation only as part of operating and improving Ask AI.
          </p>
        </section>

        <section>
          <h2>Please avoid private information</h2>
          <p>
            Conversation text may contain personal information if you type it. Do not submit
            passwords, contact details, health information, financial information, or anything
            else you consider private.
          </p>
        </section>

        <section>
          <h2>Retention and control</h2>
          <p>
            Conversations expire after 30 days. You can clear the consent checkbox to prevent
            another question from being sent and stored. For an access or deletion request, use
            the contact link on the homepage and include the approximate date and content of the
            conversation so it can be located.
          </p>
        </section>
      </div>
    </article>
  )
}
