# AGENTS.md

Guidance for AI coding agents (Claude Code, Cursor, Copilot, etc.) working in
this repository. Humans should read the [README](README.md) first; this file is
the operational contract for agents.

> **TL;DR** — Respect the layered architecture, keep the dependency rule
> (dependencies point inward), never let infrastructure leak into the domain,
> and run `make verify` before you consider a change done.

---

## 1. What this project is

A production-ready Flutter **boilerplate** built around Clean Architecture and a
feature-first folder layout. It ships two example features (`counter`, `posts`)
that demonstrate the intended patterns end to end. Treat those as the reference
implementation — new code should look like them.

## 2. Golden rules

1. **The dependency rule is absolute.** `presentation → domain ← data`. The
   `domain` layer must never import from `data`, `presentation`, Flutter, Dio,
   or any package outside `core/utils` + `core/error`.
2. **Errors cross boundaries as values, not exceptions.** Data sources throw
   typed `Exception`s (`core/error/exceptions.dart`); repositories catch them
   and return `Result<T>` with a `Failure` (`core/error/failure.dart`). The
   presentation layer only ever sees `Result`/`Failure`.
3. **No secrets in source.** Configuration comes from `--dart-define` via
   `AppConfig` (`core/config/app_config.dart`). Never hardcode URLs, tokens or
   keys.
4. **Riverpod is used without code generation.** Declare providers manually
   (`Provider`, `NotifierProvider`, `AsyncNotifierProvider`). Do **not** add
   `riverpod_generator`/`riverpod_annotation`: on the pinned SDK they force
   `freezed_annotation ^2.x`, which conflicts with the freezed 3.x used for
   models. Revisit once the project moves to Dart ≥3.12.
5. **freezed + json_serializable are used _only_ for models** (entities and
   DTOs). After editing an annotated class, regenerate with `make gen`.
6. **Every change must pass `make verify`** (format + analyze + test) with zero
   issues. The analyzer is configured strictly; treat warnings as errors.
7. **The design system is not optional.** All UI goes through
   `lib/core/theme/` tokens and the shared widget kit — never a hardcoded
   colour, radius or duration. See §8.

## 3. Architecture map

```
lib/
├── main.dart                 # entry point → bootstrap(App.new)
├── bootstrap.dart            # zone guard, global error handling, DI overrides
├── app/                      # app shell: root widget + routing
│   ├── app.dart
│   └── router/               # go_router config + typed AppRoute enum
├── core/                     # cross-cutting, feature-agnostic building blocks
│   ├── config/               # AppConfig (dart-define)
│   ├── error/                # Failure (domain) + Exceptions (data)
│   ├── network/              # Dio client + interceptors
│   ├── providers/            # infrastructure providers (dio, storage)
│   ├── storage/              # KeyValueStore / SecureStore abstractions
│   ├── theme/                # design tokens + AppTheme + ThemeMode controller
│   ├── utils/                # Result<T>, AppLogger
│   └── widgets/              # shared widget kit (barrel: widgets.dart)
├── features/
│   ├── auth/                 # login screen + AuthController (no real backend)
│   ├── shell/                # ScaffoldWithNavBar: the bottom tab shell
│   ├── home/  posts/  profile/  counter/  showcase/
│   └── <feature>/            # one folder per feature, layers as needed:
│       ├── data/             #   datasources, models (DTOs), repository impls
│       ├── domain/           #   entities, repository interfaces, use cases
│       └── presentation/     #   providers (controllers), pages, widgets
└── l10n/                     # arb/ source strings, gen/ generated, l10n.dart
```

Data flow for a network read (see `features/posts`):

```
Widget → watch(controllerProvider)         # presentation
      → UseCase                            # domain (business rules)
      → Repository (interface in domain)   # domain contract
      → RepositoryImpl (maps errors)       # data
      → RemoteDataSource (Dio)             # data
      → DTO.fromJson → DTO.toEntity()      # data → domain
```

## 4. How to add a new feature (follow this recipe)

Create `lib/features/<name>/` with `data/`, `domain/`, `presentation/`:

1. **domain/entities** — immutable `@freezed` entity (no JSON, no Flutter).
2. **domain/repositories** — an `abstract interface class` returning
   `Future<Result<...>>`.
3. **domain/usecases** — one class per action with a `call()` method; put
   business rules here.
4. **data/models** — `@freezed` DTO with `fromJson` + a `toEntity()` mapper.
5. **data/datasources** — interface + impl that talks to Dio and throws typed
   exceptions.
6. **data/repositories** — impl that catches exceptions → `Failure`, maps DTO →
   entity.
7. **presentation/providers** — wire the layers as providers; expose an
   `AsyncNotifier`/`Notifier` controller.
8. **presentation/pages + widgets** — `ConsumerWidget`s; render async state via
   `AsyncValueView`.
9. **Add a route** in `app/router/app_routes.dart` + `app_router.dart`.
10. **Add strings** to `lib/l10n/arb/app_en.arb` (and `app_es.arb`), then
    `make l10n`.
11. **Write tests** mirroring the structure under `test/`.

## 5. Testing conventions

- Mirror `lib/` under `test/`. Name files `*_test.dart`.
- **Domain/data:** pure unit tests. Mock collaborators with `mocktail`
  (see `test/features/posts/data/post_repository_impl_test.dart`).
- **Network:** inject a fake `HttpClientAdapter` into Dio — do not hit the
  network (see `post_remote_data_source_test.dart`).
- **Presentation:** widget tests using `ProviderContainer`/provider overrides
  and the `tester.pumpApp(...)` helper in `test/support/pump_app.dart`.
- **Theme:** `pumpApp` mounts the real `AppTheme`, which widget code requires —
  `context.palette` asserts when the `AppPalette` extension is missing. If you
  build your own `MaterialApp` in a test, pass `theme: AppTheme.light()`.
- Assert on `Failure` subtypes, not on strings.

## 6. Commands

| Task              | Command                                    |
| ----------------- | ------------------------------------------ |
| Install deps      | `flutter pub get`                          |
| Codegen (freezed) | `make gen` / `dart run build_runner build` |
| Localizations     | `make l10n` / `flutter gen-l10n`           |
| Format            | `make format` / `dart format .`            |
| Analyze           | `make analyze` / `flutter analyze`         |
| Test              | `make test` / `flutter test`               |
| **Verify all**    | `make verify`                              |
| Run (dev)         | `make run` (uses `config/dev.json`)        |

## 7. Do / Don't

**Do**
- Keep widgets dumb; push logic into controllers and use cases.
- Add new cross-cutting helpers under `core/`, not inside a feature.
- Reuse the shared widget kit (`core/widgets/widgets.dart`: `AppButton`,
  `AppTextField`, `AppCard`, `Gap`, `EmptyView`, `showConfirmDialog`,
  `context.showSnackBar`, …) before hand-rolling new UI. Add new kit widgets to
  the barrel **and** to the components gallery (`features/showcase`).
- Use spacing/radius tokens from `core/theme/app_spacing.dart` instead of magic
  numbers.
- Add tabs as `StatefulShellBranch`es in `app/router/app_router.dart`; guard
  routes via the `redirect` that watches `authControllerProvider`.
- Use `context.l10n.<key>` for user-facing text — never hardcode strings.
- Prefer `const` constructors and `final` fields.

**Don't**
- Don't import `package:flutter/*` from `domain/`.
- Don't call Dio or `SharedPreferences` outside `data/` and `core/`.
- Don't catch-and-swallow errors; map them to a `Failure`.
- Don't edit generated files (`*.g.dart`, `*.freezed.dart`, `l10n/gen/**`).
- Don't commit `config/*.json` (only the `*.example.json` files).

## 8. Design system

The app ships **one** visual language, called *Minimal editorial dual*, defined
in `lib/core/theme/`. Light and dark are hand-picked and **not** derived from a
seed colour, and every foreground/background pair passes WCAG AA — asserted in
`test/core/theme/app_palette_test.dart`.

| File | Owns |
| --- | --- |
| `app_colors.dart` | `AppPalette` — semantic tokens, read as `context.palette` |
| `app_typography.dart` | explicit type scale + quiet uppercase `sectionLabel` |
| `app_spacing.dart` | spacing, radii, `AppStroke.hairline`, `AppElevation` |
| `app_motion.dart` | durations, house curve, reduced-motion handling |
| `app_theme.dart` | both `ThemeData`s and every component theme |
| `theme_controller.dart` | persisted `ThemeMode` (system / light / dark) |

**Do**
- Read colours from `context.palette`; sizes from `AppSpacing`/`AppRadius`.
- Separate surfaces with a hairline (`Hairline`, `BorderSide`, `outline`);
  shadows only on overlays, via `AppElevation`.
- Spend the accent on the primary action, links, the focus ring and the active
  state — nothing else.
- Reuse the kit and register new widgets in `core/widgets/widgets.dart` **and**
  in the components gallery (`features/showcase/`).
- Route animation durations through `AppMotion.duration(context, ...)`.

**Don't**
- Don't `ColorScheme.fromSeed` the brand, or add a second accent hue.
- Don't hardcode hex values, `BorderRadius.circular(12)` or `Duration(ms: 200)`.
- Don't use `sectionLabel` (12px uppercase, 0.12em tracking) for body copy,
  input values or anything the user must read to act.
- Don't add gradient text, glows, grain or decorative illustrations.
- Don't build a widget under a bare `MaterialApp` in production code: the
  palette asserts when the theme is missing.

## 9. Definition of done

- [ ] `make verify` passes (format clean, analyze clean, all tests green).
- [ ] New code has tests mirroring `lib/` structure.
- [ ] No new hardcoded strings, URLs, or secrets.
- [ ] The dependency rule holds; generated files regenerated if models changed.
