# Security & Git

## SaaS security baseline

- Passwords hashed with a strong algorithm (argon2).
- JWT access token short-lived; refresh token long-lived with rotation.
- Store the refresh token in an httpOnly, Secure, SameSite cookie — never
  in localStorage.
- Strava access/refresh tokens are stored ENCRYPTED at rest.
- Secrets come from environment variables only. NEVER commit a .env file
  or hardcode a secret.

## Git workflow (trunk-based)

- Feature branches -> PR -> main. main auto-deploys to staging.
- Production deploy via release tag with a manual approval gate.
- Conventional Commits for all commit messages.
