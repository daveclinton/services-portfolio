import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Privacy",
  description: "How the Ask AI feature handles conversation data.",
}

export default function PrivacyPage() {
  return (
    <article className="mx-auto w-full max-w-[42rem] py-8 sm:py-12">
      <Link
        href="/ask-ai"
        className="text-caption text-muted-foreground underline underline-offset-4 hover:text-foreground"
      >
        Back to Ask AI
      </Link>

      <h1 className="mt-6 text-3xl font-semibold tracking-tight text-foreground">
        Ask AI privacy
      </h1>

      <div className="mt-6 space-y-6 text-body leading-7 text-foreground/85">
        <section>
          <h2 className="font-semibold text-foreground">Conversation storage and consent</h2>
          <p className="mt-2">
            To use Ask AI, you must select the consent checkbox before sending a question. Your
            questions and the assistant&apos;s responses are then stored for 30 days so I can review
            answer quality and improve the feature. You can choose not to use Ask AI if you do not
            want the conversation stored.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-foreground">Technical information</h2>
          <p className="mt-2">
            Stored records include a random conversation identifier, timestamps, response
            status, broad device type, browser family, and operating-system family. The raw IP
            address and complete browser user-agent string are not stored. A one-way network hash
            that changes each day is retained for short-term abuse and quality analysis.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-foreground">Please avoid private information</h2>
          <p className="mt-2">
            Conversation text may contain personal information if you type it. Do not submit
            passwords, contact details, health information, financial information, or anything
            else you consider private.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-foreground">Retention and control</h2>
          <p className="mt-2">
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
