# CLAUDE.md

This project's agent guidance lives in **[AGENTS.md](AGENTS.md)**. Read it in
full before making changes — it defines the architecture, the dependency rule,
conventions, commands, and the definition of done.

Quick reminders for Claude Code:

- Run `make verify` (format + analyze + test) before finishing any change.
- Riverpod is used **without** code generation; freezed/json_serializable are
  used for models only — run `make gen` after editing an annotated model.
- Never let infrastructure (Dio, SharedPreferences, Flutter) leak into
  `lib/features/*/domain/`.
- Never edit generated files: `*.g.dart`, `*.freezed.dart`, `lib/l10n/gen/**`.
