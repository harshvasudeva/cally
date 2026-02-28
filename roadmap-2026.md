# Cally Roadmap 2026: The Self-Hosted Scheduling Evolution

This roadmap outlines the path for **Cally** to become the premier self-hosted, non-dockerized scheduling platform. Focus areas include extreme security, production-grade stability, and advanced automation.

---

## 🔐 Security & Hardening (20 Items)
1.  **Two-Factor Authentication (2FA):** Implement TOTP (Google Authenticator/Authy) support for all user accounts.
2.  **WebAuthn/Passkeys:** Support hardware security keys and biometric login for passwordless entry.
3.  **Advanced Rate Limiting:** Implement IP-based and user-based rate limiting on all API routes using Redis or a local memory store.
4.  **Audit Logging:** Record every administrative action (login, setting change, appointment deletion) in a dedicated `AuditLog` table.
5.  **CSRF Protection:** Ensure robust CSRF tokens for all state-changing requests, beyond Next.js defaults.
6.  **Session Management Dashboard:** Allow users to view and revoke active sessions from other devices.
7.  **Database Encryption:** Implement at-rest encryption for sensitive fields like `smtpPass` and `discordBotToken` using AES-256.
8.  **Automated Security Scanning:** Integrate `npm audit` and `snyk` into the local development/deployment workflow.
9.  **Security Headers:** Configure strict CSP (Content Security Policy), HSTS, and X-Frame-Options.
10. **Password Policy Enforcement:** Require minimum length, complexity, and check against "Have I Been Pwned" API.
11. **Account Lockout:** Automatically lock accounts after X failed login attempts with a cooldown period.
12. **Email Verification:** Force email verification for all new registrations before allowing booking page creation.
13. **Sensitive Data Masking:** Mask API keys and secrets in the UI by default.
14. **OAuth Scoping:** Implement fine-grained scopes if Cally ever acts as an OAuth provider.
15. **SQL Injection Prevention:** Conduct a full review of Prisma queries to ensure no raw queries are vulnerable.
16. **Input Sanitization:** Rigorous HTML sanitization for `guestNotes` and `description` fields to prevent XSS.
17. **File Upload Security:** If avatars are enabled, implement strict MIME type checking and malware scanning.
18. **Brute Force Protection for Booking:** Rate limit booking attempts per slug to prevent spam bookings.
19. **Private Booking Pages:** Support password-protected booking slugs.
20. **IP Whitelisting:** Allow admins to restrict dashboard access to specific IP ranges.

## 🚀 Production Readiness & Operations (15 Items)
21. **Systemd Service Templates:** Provide optimized `.service` files for running Cally and the Discord bot as background daemons.
22. **Automated Backups:** A built-in script/cron job to backup the SQLite database (or Postgres dump) to a local or remote directory.
23. **Health Check Endpoint:** `/api/health` to monitor database connectivity and service status.
24. **Log Rotation & Centralization:** Configure `winston` or `pino` for structured logging with daily rotation.
25. **Env Validation:** Use `zod` to validate all environment variables on startup, failing fast if missing.
26. **Database Migration Safety:** Implement a "maintenance mode" flag to disable the UI during schema migrations.
27. **SSL/TLS Setup Guide:** Comprehensive documentation for Nginx/Caddy reverse proxy configuration.
28. **Memory Profiling:** Regular checks to ensure the Node.js process doesn't leak memory during long uptimes.
29. **Error Tracking:** Integration with Sentry or a self-hosted GlitchTip instance.
30. **Dependency Update Strategy:** Monthly automated checks for security patches in `node_modules`.
31. **Graceful Shutdown:** Handle `SIGTERM` and `SIGINT` to close database connections and finish pending requests.
32. **System Resources Dashboard:** View CPU/RAM usage of the Cally process directly from the admin panel.
33. **Disk Space Alerts:** Notify admins if the database or log partition is nearing capacity.
34. **Cold Start Optimization:** Optimize Next.js build and Prisma client generation for faster restarts.
35. **Update Notification:** Check for new Cally versions on GitHub and notify the admin.

## 📈 Scalability & Performance (10 Items)
36. **PostgreSQL/MySQL Support:** Add full support for robust relational databases beyond SQLite.
37. **Redis Caching:** Cache availability slots and user settings to reduce database load.
38. **Edge-Ready Logic:** Move timezone and availability calculations to optimized utility functions.
39. **Image Optimization:** Implement local image resizing for avatars and logos (using `sharp`).
40. **Database Indexing:** Optimize Prisma schema with indexes on `slug`, `email`, and `userId`.
41. **Query Optimization:** Refactor `findMany` calls to use `select` instead of fetching entire objects.
42. **Background Job Queue:** Implement `BullMQ` or `Graphile Worker` for sending emails and processing bot notifications.
43. **Static Generation for Booking:** Use ISR (Incremental Static Regeneration) for booking pages to serve them instantly.
44. **Client-Side State Management:** Optimize React state to prevent unnecessary re-renders in the calendar view.
45. **API Versioning:** Introduce `/api/v1/` to ensure backward compatibility for future integrations.

## 🤖 Bot & Integration Ecosystem (15 Items)
46. **Telegram Bot:** Create a parity bot for Telegram using `telegraf`.
47. **Discord Webhooks:** Support sending booking notifications to specific Discord channels.
48. **Slash Command Expansion:** `/status` to check upcoming meetings, `/reschedule` via Discord.
49. **Bot Localization:** Support multiple languages in bot responses.
50. **Interactive Bot Modals:** Use Discord's latest modal features for full booking within the client.
51. **Calendar Sync (Google):** Two-way sync with Google Calendar API.
52. **Calendar Sync (Outlook):** Two-way sync with Microsoft Graph API.
53. **iCal Subscription:** Provide a private iCal URL for users to subscribe in Apple Calendar/Basecamp.
54. **Slack Integration:** A dedicated Slack App for notifications and quick-actions.
55. **Zapier/Make.com Integration:** Webhooks and triggers for 5000+ external apps.
56. **Matrix/Element Bot:** Support for decentralized chat notifications.
57. **WhatsApp Notifications:** Optional integration via Twilio or similar for high-priority alerts.
58. **Browser Extension:** A Chrome/Firefox extension for quick access to booking links.
59. **Desktop Notifications:** Native OS notifications for the web dashboard.
60. **Bot 'Quiet Hours':** Allow users to silence bot notifications during specific times.

## 📅 Advanced Scheduling Logic (15 Items)
61. **Team Scheduling:** Support for "Round Robin" or "Collective" availability.
62. **Buffer Times:** Fine-grained control over buffer times before and after events.
63. **Minimum Notice Period:** Prevent last-minute bookings (e.g., "Must book 2 hours in advance").
64. **Maximum Bookings per Day:** Cap the number of appointments a user can take daily.
65. **Multi-Day Events:** Support for bookings that span multiple days.
66. **Recurring Availability:** Advanced patterns (e.g., "Every 2nd Tuesday of the month").
67. **Custom Booking Fields:** Drag-and-drop form builder for booking questions (Checkboxes, Selects, etc.).
68. **Payment Integration:** Support Stripe for paid appointments (deposits or full payment).
69. **Timezone Intelligent UI:** Automatic detection and toggle for guest vs. host timezones.
70. **Conflict Resolver V2:** Automatic "Suggested Alternatives" when a conflict is detected.
71. **Group Bookings:** Allow multiple guests to join a single time slot (webinars/classes).
72. **Meeting Locations:** Multiple options per appointment (Zoom, Google Meet, In-person, Phone).
73. **Conditional Logic:** Show/hide booking form fields based on previous answers.
74. **Holiday Sync:** Automatically block out public holidays based on user's country.
75. **Manual Overrides:** Quickly "block out" specific dates without changing weekly availability.

## 🎨 User Experience & Interface (15 Items)
76. **Dark/Light Mode:** Full system-aware theme support with a manual toggle.
77. **Mobile-First Design:** Complete overhaul of the dashboard for touch-screen efficiency.
78. **Accessibility (A11y):** WCAG 2.1 compliance with proper ARIA labels and keyboard navigation.
79. **White-Labeling:** Allow admins to replace "Cally" branding with their own logo/colors.
80. **Drag-and-Drop Calendar:** Reschedule appointments by dragging them on the FullCalendar view.
81. **Toast Notifications:** Smooth, non-intrusive alerts for every action.
82. **Loading States:** Consistent skeletons and progress bars for all data fetching.
83. **Onboarding Wizard:** A "First Run" guide to help users set up availability and their first link.
84. **Multi-Language Support (i18n):** Full localization using `next-intl` or `i18next`.
85. **Custom CSS:** Allow users to inject custom CSS for their public booking pages.
86. **Print-Friendly Views:** Optimized CSS for printing the daily/weekly agenda.
87. **Interactive Conflict Preview:** Visually see where a new booking sits between existing events.
88. **Search & Filter:** Search through appointments by guest name, email, or status.
89. **Keyboard Shortcuts:** `CMD+K` command palette for quick navigation.
90. **Bulk Actions:** Approve, cancel, or delete multiple appointments at once.

## 🛠 Developer Experience & Extensibility (10 Items)
91. **Plugin Architecture:** Allow "hooks" for developers to add custom logic without modifying core files.
92. **API Documentation:** Auto-generated Swagger/OpenAPI documentation for the `/api` routes.
93. **Unit & Integration Tests:** Reach 80%+ coverage with Vitest and Playwright.
94. **Developer CLI:** A `cally-cli` tool for managing the database and users from the terminal.
95. **Component Library:** Documented Tailwind components for consistent UI development.
96. **Pre-commit Hooks:** Ensure linting and type-checking pass before every commit.
)97. **Schema Visualization:** Tooling to generate ERD diagrams from `schema.prisma`.
98. **Mock Data Generator:** A script to populate the DB with dummy events/users for testing.
99. **Contribute Guide:** Detailed `CONTRIBUTING.md` for community involvement.
100. **Architecture Decision Records (ADR):** Document why key technical choices were made.
