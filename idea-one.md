Title
Building Email Delivery From Scratch for OTP and Auth Notifications: What It Really Takes

Article outline

Why this article exists

The common belief that apps can “just send emails”

Why OTP and auth emails expose delivery problems fast

What this article will and will not cover

What people mean when they say “email infrastructure”

Difference between generating an email and delivering it

Where SMTP actually fits

Why inbox providers trust servers, not applications

A concrete OTP use case

Login, sign-up, and password reset flows

Timing guarantees your auth system assumes

Why delivery delays break UX and security

SMTP, explained without hand-waving

What SMTP is and what it is not

Server-to-server delivery model

The SMTP handshake and where rejection happens

The minimum viable self-hosted setup

Physical server requirements

IP address and reverse DNS reality

Why outbound-only is the correct first step

Domain authentication and identity

SPF: authorizing senders

DKIM: message integrity and trust

DMARC: policy and reporting

Why alignment matters more than presence

Deliverability is the real system

IP warm-up and throttling

Provider-specific behavior (Gmail, Microsoft, Yahoo)

Bounce handling and suppression

Why “low volume” does not mean “low effort”

OTP-specific constraints

Content design for high inbox acceptance

Rate limiting and abuse prevention

Expiry windows vs real-world delays

Resend and fallback strategies

What breaks first in self-hosted email

Missing PTR and HELO mismatch

Dirty IPs and inherited reputation

Silent spam placement vs hard rejects

Operational mistakes that kill trust

Solo developer reality check

Time investment vs benefit

Ongoing operational responsibility

When self-hosting is reasonable

When a provider is the correct trade-off

Why email SaaS products exist

What services like Resend actually abstract

The parts you still own even when you outsource

Cost vs control trade-offs

Key takeaways

Email delivery is infrastructure and operations

OTP emails demand reliability, not cleverness

There are no shortcuts, only trade-offs