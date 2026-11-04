---
type: project-overview
slug: icad-conference-platform
name: ICAD Conference Platform
problem: |
  Conference organizers, reviewers, staff and attendees needed coordinated web
  and mobile workflows for papers, rooms, announcements, attendance and event
  information.
context: |
  Cross-platform conference system composed of a Next.js web application and
  an Expo/React Native mobile application, backed by a shared Neon PostgreSQL
  data model and Better Auth identity layer.
skills:
  - slug: full-stack-development
    name: Full-stack development
    category: engineering
  - slug: mobile-development
    name: Cross-platform mobile development
    category: engineering
technologies:
  - slug: nextjs
    name: Next.js 16
    category: web framework
  - slug: expo
    name: Expo 55 and Expo Router
    category: mobile framework
  - slug: react-native
    name: React Native 0.83
    category: mobile framework
  - slug: better-auth
    name: Better Auth
    category: authentication
  - slug: drizzle-orm
    name: Drizzle ORM
    category: ORM
  - slug: neon
    name: Neon PostgreSQL
    category: database
  - slug: tanstack-query
    name: TanStack Query
    category: server-state management
  - slug: eas
    name: EAS Build and Submit
    category: mobile delivery
---

Built coordinated web and mobile applications for conference operations. The
web API covers conference configuration, papers and review access, attendees,
rooms, announcements, venue guidance, attendance confirmation, invitations,
administration and role management.

The Expo application provides attendee, staff and administrator experiences,
secure authentication storage, conference data synchronization, QR-code
support, location-aware capabilities, charts, calendars, over-the-air updates,
and Android/iOS release workflows through EAS.
