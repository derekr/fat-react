# Public repository guidance

This project is intended for a public repository. Never include sensitive information or personally identifiable information (PII) in commits, source files, comments, examples, generated files, documentation, or commit messages. Use invented sample data only. Do not commit credentials, tokens, private URLs, local configuration, or real user data.

Keep the React/Datastar ownership boundary explicit: React owns the Redact host element, and Datastar owns its contents. Validate action input on the server even when the client has TypeScript types. The GitHub Pages service worker is a demo-only mock backend; production integrations must enforce their own authentication and authorization.
