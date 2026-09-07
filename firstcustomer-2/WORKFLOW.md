# FirstCustomer development workflow

GitHub is the source of truth for this project.

## Branching
- `main`: deployable baseline.
- Feature work: short-lived branches such as `feat/marketplace-feed` or `fix/referral-attribution`.

## Working with ChatGPT
When changes are requested in chat:
1. Read the current GitHub version first.
2. Make the requested edits against that version.
3. Validate TypeScript/build/tests where available.
4. Commit with a descriptive message.
5. Push the commit to GitHub and report the commit SHA.

Do not store production secrets in the repository. Use deployment-provider environment variables.
