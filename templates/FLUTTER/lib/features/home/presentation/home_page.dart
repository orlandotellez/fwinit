import 'package:flutter/material.dart';
import 'package:fwiflu/app/router/app_routes.dart';
import 'package:fwiflu/core/theme/app_colors.dart';
import 'package:fwiflu/core/theme/app_spacing.dart';
import 'package:fwiflu/core/widgets/widgets.dart';
import 'package:fwiflu/l10n/l10n.dart';
import 'package:go_router/go_router.dart';

/// The "Home" tab: the brand's front door and a quiet index of the examples.
///
/// Editorial layout rather than a card grid: one headline, one supporting
/// line, a hairline, and hairline-separated rows instead of illustration
/// panels.
class HomePage extends StatelessWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final palette = context.palette;
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(title: Text(l10n.homeTitle)),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.md),
        children: [
          AppReveal(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const AppIconBox(icon: Icons.layers_outlined),
                    const Gap.h(AppSpacing.sm),
                    Text(
                      l10n.appTitle,
                      style: theme.textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
                const Gap(AppSpacing.xl),
                Text(l10n.homeWelcome, style: theme.textTheme.displaySmall),
                const Gap(AppSpacing.sm),
                Text(
                  l10n.homeSubtitle,
                  style: theme.textTheme.bodyLarge?.copyWith(
                    color: palette.textMuted,
                  ),
                ),
                const Gap(AppSpacing.xl),
                const Hairline(),
              ],
            ),
          ),
          const Gap(AppSpacing.lg),
          SectionHeader(title: l10n.homeExamplesSection),
          AppCard(
            padding: EdgeInsets.zero,
            child: Column(
              children: [
                _NavRow(
                  icon: Icons.add_circle_outline,
                  title: l10n.counterTitle,
                  subtitle: l10n.homeCounterSubtitle,
                  onTap: () => context.pushNamed(AppRoute.counter.name),
                ),
                const Hairline(indent: AppSpacing.md, endIndent: AppSpacing.md),
                _NavRow(
                  icon: Icons.widgets_outlined,
                  title: l10n.componentsTitle,
                  subtitle: l10n.homeComponentsSubtitle,
                  onTap: () => context.pushNamed(AppRoute.components.name),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// A quiet, hairline-separated row: icon box, title, one-line description.
class _NavRow extends StatelessWidget {
  const _NavRow({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final palette = context.palette;
    final theme = Theme.of(context);

    return InkWell(
      onTap: onTap,
      overlayColor: WidgetStatePropertyAll<Color?>(palette.accentSoft),
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.md),
        child: Row(
          children: [
            AppIconBox(icon: icon),
            const Gap.h(AppSpacing.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: theme.textTheme.titleMedium),
                  Text(
                    subtitle,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: palette.textMuted,
                    ),
                  ),
                ],
              ),
            ),
            Icon(Icons.chevron_right, color: palette.textMuted),
          ],
        ),
      ),
    );
  }
}
