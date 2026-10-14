# Contributing

Thanks for contributing! A few conventions keep this template healthy.

## Workflow

1. Branch off `main`.
2. Make your change following the architecture in [`AGENTS.md`](AGENTS.md).
3. Run the full gate locally before pushing:
   ```bash
   make verify   # format check + analyze + test
   ```
4. Open a PR.

## Ground rules

- **Respect the dependency rule.** `domain/` stays pure — no Flutter, Dio, or
  JSON.
- **Errors are values.** Map exceptions to `Failure` and return `Result<T>`.
- **Test what you add.** Mirror `lib/` under `test/`.
- **Regenerate code** after touching `@freezed`/JSON models (`make gen`) or ARB
  files (`make l10n`). Never hand-edit generated files.
- **Formatting is enforced.** Run `make format` before committing.

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/):
`feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:` …
