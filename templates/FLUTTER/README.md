# fwiflu

A **production-ready Flutter boilerplate** built by (and for) experienced
teams. It bakes in Clean Architecture, a feature-first structure, sensible
state management, typed error handling, localization, a real dual design
system, testing, CI, and first-class support for AI coding agents — so you can
start shipping features on day one instead of wiring plumbing.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## ✨ Highlights

- **Clean Architecture** with a strict dependency rule (`presentation → domain ← data`).
- **Feature-first** folders — each feature owns its three layers.
- **Bottom-tab navigation shell** (go_router `StatefulShellRoute`) + a **login
  screen** with an auth-guarded `redirect`.
- **Shared widget kit** — buttons, inputs, cards, dialogs, snackbars, empty
  states… plus a live **components gallery**.
- **Riverpod** for state management & DI (no code-gen required → fewer moving parts).
- **Typed error handling** via a `Result<T>` type and a `Failure` hierarchy — no
  more untyped `catch`.
- **Dio** networking with interceptors and a testable client.
- **freezed + json_serializable** for immutable models and DTOs.
- **go_router** with a type-safe route enum.
- **Localization** (i18n) via the official `gen-l10n` (English + Spanish included).
- **A real design system** (*Minimal editorial dual*): hand-picked light and dark
  palettes that pass WCAG AA, an explicit type scale, motion tokens, hairline
  surfaces instead of shadows, and a persisted system/light/dark switch.
- **Config via `--dart-define`** (dev/staging/prod flavors) — zero secrets in source.
- **Thorough tests**: unit, repository (mocktail), network (fake adapter), and widget tests.
- **Strict linting** and a one-command `make verify` gate.
- **`Makefile`** of common tasks (setup, codegen, test, verify, run).
- **Agent-ready**: [`AGENTS.md`](AGENTS.md) + [`CLAUDE.md`](CLAUDE.md).

## 🧱 Tech stack

| Concern            | Choice                                  |
| ------------------ | --------------------------------------- |
| State management   | `flutter_riverpod`                      |
| Navigation         | `go_router`                             |
| Networking         | `dio`                                   |
| Models / immutable | `freezed`, `json_serializable`          |
| Local storage      | `shared_preferences`                    |
| Secure storage     | `flutter_secure_storage`                |
| Logging            | `logger`                                |
| i18n               | `flutter_localizations`, `intl`, gen-l10n |
| Testing            | `flutter_test`, `mocktail`              |
| Lint               | `flutter_lints` (tightened)             |

## 🚀 Getting started

```bash
# 1. Clone and rename (see "Renaming the project" below)
git clone <your-fork> my_app && cd my_app

# 2. Create your local config from the template
cp config/dev.example.json config/dev.json

# 3. One-time setup: deps + codegen + localizations
make setup      # == flutter pub get && dart run build_runner build && flutter gen-l10n

# 4. Run it
make run        # == flutter run --dart-define-from-file=config/dev.json
```

**Requirements:** Flutter `>=3.41` / Dart `>=3.11` (see `environment` in
`pubspec.yaml`).

## 📁 Project structure

```
lib/
├── main.dart                 # entry point → bootstrap(App.new)
├── bootstrap.dart            # zone guard, global error handling, DI overrides
├── app/                      # app shell: root widget + routing
├── core/                     # cross-cutting building blocks
│   ├── config/  error/  network/  providers/
│   ├── storage/ theme/   utils/
│   └── widgets/              # shared widget kit (barrel: widgets.dart)
├── features/
│   ├── auth/                 # login screen + AuthController (no real backend)
│   ├── shell/                # bottom-tab scaffold (ScaffoldWithNavBar)
│   ├── home/                 # Home tab: dashboard
│   ├── profile/              # Profile tab: account + logout
│   ├── counter/              # example: simple synchronous state
│   ├── showcase/             # live gallery of the widget kit
│   └── posts/                # example: full network → domain → UI (list + detail)
│       ├── data/             #   datasources, models (DTOs), repository impl
│       ├── domain/           #   entities, repository interface, use cases
│       └── presentation/     #   providers, pages (list + detail), widgets
└── l10n/                     # arb/ (source), gen/ (generated), l10n.dart
```

## 🏛️ Architecture

This template follows **Clean Architecture**. The one rule that matters: source
code dependencies always point **inward**, toward the domain.

```
        ┌─────────────────────────────────────────────┐
        │                presentation                  │  Widgets, Controllers
        │   (ConsumerWidgets, Notifier/AsyncNotifier)  │
        └───────────────────────┬─────────────────────┘
                                 │ depends on
        ┌───────────────────────▼─────────────────────┐
        │                   domain                     │  Pure Dart. No Flutter.
        │  Entities · Repository interfaces · UseCases │  No Dio. No JSON.
        └───────────────────────▲─────────────────────┘
                                 │ implements
        ┌───────────────────────┴─────────────────────┐
        │                    data                      │  Dio, JSON, storage
        │  DataSources · DTOs · Repository impls       │
        └─────────────────────────────────────────────┘
```

**Error handling.** Data sources throw typed exceptions
(`core/error/exceptions.dart`). Repositories catch them and return a
`Result<T>` holding either a value or a `Failure` (`core/error/failure.dart`).
Controllers surface failures to the UI, which renders them with the shared
`AsyncValueView`/`ErrorView`. Errors are **values**, checked by the compiler —
not surprises at runtime.

The `posts` feature is a complete, copy-me reference of this flow. The `counter`
feature shows the simplest possible synchronous state.

## 🧭 Navigation & auth

Navigation uses go_router's `StatefulShellRoute.indexedStack` for a **bottom
tab bar** (`features/shell/`), where each tab keeps its own navigation stack.
The app is gated by a **login screen** (`features/auth/`): the router's
`redirect` watches `authControllerProvider` and bounces unauthenticated users
to `/login`, and signed-in users away from it.

> The login flow is intentionally a stub — pressing **Sign in** just flips the
> auth flag so you can see the navigation. Wire `AuthController` to a real
> backend (and persist a token via `SecureStore`) when you're ready.

## 🧰 Widget kit

A set of reusable building blocks lives in `core/widgets/` and is exported via a
single barrel — `import 'package:fwiflu/core/widgets/widgets.dart';`:

| Widget / helper       | Purpose                                     |
| --------------------- | ------------------------------------------- |
| `AppButton`           | Buttons with variants, icon & loading state |
| `AppTextField`        | Labeled input with password toggle          |
| `AppCard`             | Consistent tappable card container          |
| `AppAvatar`           | Circle avatar with initials fallback        |
| `AppIconBox`          | 24px glyph in a 40x40 muted square          |
| `Hairline`            | 1px rule in the border colour               |
| `AppReveal`           | 12px fade-and-lift entrance                 |
| `Gap` / `AppSpacing`  | Spacing without magic numbers               |
| `SectionHeader`       | Quiet uppercase section label               |
| `EmptyView` / `ErrorView` | Empty & error states                    |
| `AsyncValueView`      | Uniform loading/error/data for `AsyncValue` |
| `LoadingOverlay`      | Modal spinner over content                  |
| `showConfirmDialog`   | Standard confirmation dialog                |
| `context.showSnackBar`| Info / success / error snackbars            |

Every one of these is demonstrated live in the **Components** gallery
(`features/showcase/`), reachable from the Home tab.

## 🎨 Design system

The app ships **one** visual language, called *Minimal editorial dual*, defined
in `lib/core/theme/`. Light and dark are hand-picked and **not** derived from a
seed colour, and every foreground/background pair passes WCAG AA — asserted in
`test/core/theme/app_palette_test.dart`, not just documented.

| File | Owns |
| --- | --- |
| `app_colors.dart` | `AppPalette` — the semantic tokens, read as `context.palette` |
| `app_typography.dart` | the explicit type scale and the quiet uppercase `sectionLabel` |
| `app_spacing.dart` | spacing, radii, `AppStroke.hairline`, `AppElevation` |
| `app_motion.dart` | durations, the house curve, reduced-motion handling |
| `app_theme.dart` | both `ThemeData`s and every component theme |
| `theme_controller.dart` | the persisted `ThemeMode` (system / light / dark) |

The rules that keep it coherent:

1. **Never hardcode a colour, radius or duration.** Read `context.palette` and
   use the `AppSpacing`/`AppRadius`/`AppStroke`/`AppMotion` tokens.
2. **Hairlines, not shadows.** Elevation is surface contrast plus a 1px border;
   shadows are reserved for overlays via `AppElevation`.
3. **One accent, used surgically** — the primary action, links, the focus ring
   and the active state. No second brand hue, no gradients, no glows.
4. **Colour carries meaning only** where it is semantic (`success`, `danger`,
   `warning`, `info`).
5. **Quiet uppercase labels** come from `AppTypography.sectionLabel` through
   `SectionHeader`; never use that treatment for body copy or input values.
6. **Reuse the kit** before hand-rolling UI, and add every new kit widget to the
   barrel *and* to the components gallery.
7. **Motion is short** (150 / 220 / 550 ms on `cubic(0.16, 1, 0.3, 1)`) and
   always goes through `AppMotion.duration`, so reduced motion is honoured.
8. **Widget tests must mount the real theme.** `context.palette` asserts when
   the `AppPalette` extension is missing: use the `pumpApp` helper or pass
   `theme: AppTheme.light()`.

Users pick the mode in **Profile → Appearance**; the choice is restored from
storage in `bootstrap()` *before* the first frame, so the app never flashes the
wrong brightness.

## ➕ Adding a feature

See the step-by-step recipe in [`AGENTS.md` §4](AGENTS.md#4-how-to-add-a-new-feature-follow-this-recipe).
In short: create `lib/features/<name>/{data,domain,presentation}`, follow the
`posts` example, wire providers, add a route, add ARB strings, and write tests.

## 🌐 Configuration & flavors

Configuration is injected at build time — nothing sensitive lives in source.

```bash
flutter run --dart-define-from-file=config/dev.json
flutter build apk --dart-define-from-file=config/prod.json
```

`config/*.json` is git-ignored; only the `*.example.json` templates are
committed. Values are read through `AppConfig` (`lib/core/config/app_config.dart`),
which also exposes the current `Flavor` (dev / staging / prod).

## 🌍 Localization

Source strings live in `lib/l10n/arb/` (`app_en.arb`, `app_es.arb`).
Regenerate the typed accessors with `make l10n`, then use them via the
`context.l10n` extension:

```dart
Text(context.l10n.postsTitle);
```

## 🧪 Testing

```bash
make test          # run all tests
make coverage      # run with coverage → coverage/lcov.info
```

Tests mirror the `lib/` structure under `test/`:

- **`result_test.dart`** — the functional `Result` type.
- **`counter_controller_test.dart`** — Riverpod controller via `ProviderContainer`.
- **`post_repository_impl_test.dart`** — error mapping with `mocktail`.
- **`post_remote_data_source_test.dart`** — Dio against a fake `HttpClientAdapter`.
- **`posts_page_test.dart`** — widget test with provider overrides + `pumpApp`.

## 🛠️ Common commands

Run `make help` for the full list.

| Task           | Command        |
| -------------- | -------------- |
| Setup          | `make setup`   |
| Codegen        | `make gen`     |
| Localizations  | `make l10n`    |
| Format         | `make format`  |
| Analyze        | `make analyze` |
| Test           | `make test`    |
| **Verify all** | `make verify`  |
| Run (dev)      | `make run`     |

## 🤖 Working with AI agents

This repo is set up for AI coding agents. [`AGENTS.md`](AGENTS.md) is the
operational contract (architecture, conventions, do/don'ts, definition of done);
[`CLAUDE.md`](CLAUDE.md) points Claude Code at it. Keeping these accurate is the
single biggest lever for good agent output.

## ✏️ Renaming the project

Replace `fwiflu` (Dart package) and `mx.apto` (bundle id) with your
own:

```bash
# Option A: use a tool
dart pub global activate rename
rename setAppName --value "My App"
rename setBundleId --value com.mycompany.myapp

# Option B: manual — update `name:` in pubspec.yaml, the imports
# (package:fwiflu/...), and the applicationId / bundle identifier
# under android/ and ios/.
```

## 📄 License

[MIT](LICENSE) © 2026 Apto. Use it, fork it, ship it.
