import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:fwiflu/core/theme/app_colors.dart';
import 'package:fwiflu/core/theme/app_motion.dart';
import 'package:fwiflu/core/theme/app_spacing.dart';
import 'package:fwiflu/core/theme/app_typography.dart';
import 'package:fwiflu/core/widgets/widgets.dart';
import 'package:fwiflu/l10n/l10n.dart';

/// A living catalog of the fwiflu design system.
///
/// The gallery is documentation first: it shows the tokens (colour, type,
/// spacing, radii, motion) and then every widget of the shared kit with its
/// states. When you add a token or a component to `core/`, add it here too —
/// this page is the contract that keeps the design system honest.
class ComponentsGalleryPage extends StatefulWidget {
  const ComponentsGalleryPage({super.key});

  @override
  State<ComponentsGalleryPage> createState() => _ComponentsGalleryPageState();
}

class _ComponentsGalleryPageState extends State<ComponentsGalleryPage> {
  /// Bumped to replay the motion sample; the key forces a fresh [AppReveal].
  int _revealTick = 0;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final palette = context.palette;
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(title: Text(l10n.componentsTitle)),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.md),
        children: [
          Text(
            l10n.homeDesignSubtitle,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: palette.textMuted,
            ),
          ),
          const Gap(AppSpacing.lg),

          SectionHeader(title: l10n.componentsFoundation),
          const Gap(AppSpacing.sm),
          Wrap(
            spacing: AppSpacing.sm,
            runSpacing: AppSpacing.sm,
            children: [
              _Swatch(label: 'base', color: palette.bgBase),
              _Swatch(label: 'elevated', color: palette.bgElevated),
              _Swatch(label: 'inset', color: palette.bgInset),
              _Swatch(label: 'muted', color: palette.bgMuted),
              _Swatch(label: 'border', color: palette.border),
              _Swatch(label: 'border+', color: palette.borderStrong),
            ],
          ),
          const Gap(AppSpacing.md),
          const Wrap(
            spacing: AppSpacing.sm,
            runSpacing: AppSpacing.sm,
            children: [
              _RadiusBox(label: 'sm 8', radius: AppRadius.sm),
              _RadiusBox(label: 'md 12', radius: AppRadius.md),
              _RadiusBox(label: 'lg 16', radius: AppRadius.lg),
            ],
          ),
          const Gap(AppSpacing.lg),

          SectionHeader(title: l10n.componentsColors),
          const Gap(AppSpacing.sm),
          Wrap(
            spacing: AppSpacing.sm,
            runSpacing: AppSpacing.sm,
            children: [
              _Swatch(label: 'accent', color: palette.accent),
              _Swatch(label: 'accent+', color: palette.accentStrong),
              _Swatch(label: 'text', color: palette.textPrimary),
              _Swatch(label: 'muted', color: palette.textMuted),
              _Swatch(label: 'faint', color: palette.textFaint),
              _Swatch(label: 'success', color: palette.success),
              _Swatch(label: 'danger', color: palette.danger),
              _Swatch(label: 'warning', color: palette.warning),
              _Swatch(label: 'info', color: palette.info),
            ],
          ),
          const Gap(AppSpacing.lg),

          SectionHeader(title: l10n.componentsTypographySection),
          const Gap(AppSpacing.sm),
          _TypeSample(style: theme.textTheme.displaySmall, name: 'display'),
          _TypeSample(style: theme.textTheme.headlineSmall, name: 'headline'),
          _TypeSample(style: theme.textTheme.titleLarge, name: 'title'),
          _TypeSample(style: theme.textTheme.bodyLarge, name: 'body'),
          _TypeSample(style: theme.textTheme.bodySmall, name: 'body.small'),
          const Gap(AppSpacing.sm),
          Text(
            'SECTION LABEL',
            style: AppTypography.sectionLabel(palette.textFaint),
          ),
          const Gap(AppSpacing.lg),

          SectionHeader(title: l10n.componentsSpacing),
          const Gap(AppSpacing.sm),
          const _SpaceScale(),
          const Gap(AppSpacing.md),
          const Wrap(
            spacing: AppSpacing.sm,
            runSpacing: AppSpacing.sm,
            children: [
              _RadiusBox(label: 'sm 8', radius: AppRadius.sm),
              _RadiusBox(label: 'md 12', radius: AppRadius.md),
              _RadiusBox(label: 'lg 16', radius: AppRadius.lg),
            ],
          ),
          const Gap(AppSpacing.lg),

          SectionHeader(title: l10n.componentsMotion),
          _MotionTokens(revealTick: _revealTick, onReplay: _replayReveal),
          const Gap(AppSpacing.lg),

          SectionHeader(title: l10n.componentsStates),
          const Gap(AppSpacing.sm),
          SizedBox(
            height: 96,
            child: LoadingOverlay(
              isLoading: true,
              child: AppCard(
                child: Text(
                  l10n.componentsCardExample,
                  style: theme.textTheme.bodyMedium,
                ),
              ),
            ),
          ),
          const Gap(AppSpacing.md),
          SizedBox(
            height: 260,
            child: EmptyView(
              message: l10n.emptyPosts,
              icon: Icons.article_outlined,
              actionLabel: l10n.retry,
              onAction: () {},
            ),
          ),
          const Gap(AppSpacing.md),
          SizedBox(
            height: 300,
            child: ErrorView(message: l10n.errorNetwork, onRetry: () {}),
          ),
          const Gap(AppSpacing.md),
          const SizedBox(
            height: 72,
            child: Center(child: CircularProgressIndicator(strokeWidth: 2)),
          ),
          const Gap(AppSpacing.lg),

          SectionHeader(title: l10n.componentsButtons),
          const Gap(AppSpacing.sm),
          Wrap(
            spacing: AppSpacing.sm,
            runSpacing: AppSpacing.sm,
            children: [
              AppButton(label: 'Primary', onPressed: () {}),
              AppButton(
                label: 'Secondary',
                onPressed: () {},
                variant: AppButtonVariant.secondary,
              ),
              AppButton(
                label: 'Outline',
                onPressed: () {},
                variant: AppButtonVariant.outline,
              ),
              AppButton(
                label: 'Text',
                onPressed: () {},
                variant: AppButtonVariant.text,
              ),
              AppButton(label: 'Loading', onPressed: () {}, isLoading: true),
              AppButton(
                label: 'With icon',
                onPressed: () {},
                icon: Icons.star_outline,
              ),
              const AppButton(label: 'Disabled', onPressed: null),
            ],
          ),
          const Gap(AppSpacing.lg),

          SectionHeader(title: l10n.componentsInputs),
          const Gap(AppSpacing.sm),
          const AppTextField(
            label: 'Email',
            hint: 'you@example.com',
            prefixIcon: Icons.email_outlined,
          ),
          const Gap(AppSpacing.md),
          const AppTextField(
            label: 'Password',
            prefixIcon: Icons.lock_outline,
            obscurable: true,
          ),
          const Gap(AppSpacing.lg),

          SectionHeader(title: l10n.componentsFeedback),
          const Gap(AppSpacing.sm),
          Wrap(
            spacing: AppSpacing.sm,
            runSpacing: AppSpacing.sm,
            children: [
              AppButton(
                label: 'Info',
                variant: AppButtonVariant.secondary,
                onPressed: () => context.showSnackBar('Heads up'),
              ),
              AppButton(
                label: 'Success',
                variant: AppButtonVariant.secondary,
                onPressed: () =>
                    context.showSnackBar('Saved', type: SnackType.success),
              ),
              AppButton(
                label: 'Error',
                variant: AppButtonVariant.secondary,
                onPressed: () =>
                    context.showSnackBar('Failed', type: SnackType.error),
              ),
              AppButton(
                label: 'Confirm dialog',
                variant: AppButtonVariant.secondary,
                onPressed: () async {
                  final ok = await showConfirmDialog(
                    context,
                    title: 'Delete item?',
                    message: 'This action cannot be undone.',
                    confirmLabel: 'Delete',
                    cancelLabel: l10n.cancel,
                    isDestructive: true,
                  );
                  if (context.mounted) {
                    context.showSnackBar(ok ? 'Confirmed' : 'Cancelled');
                  }
                },
              ),
            ],
          ),
          const Gap(AppSpacing.lg),

          SectionHeader(title: l10n.componentsData),
          const Gap(AppSpacing.sm),
          AppCard(
            onTap: () {},
            child: Row(
              children: [
                const AppAvatar(name: 'Ada Lovelace'),
                const Gap.h(AppSpacing.md),
                Expanded(
                  child: Text(
                    l10n.componentsCardExample,
                    style: theme.textTheme.bodyMedium,
                  ),
                ),
                Icon(Icons.chevron_right, color: palette.textMuted),
              ],
            ),
          ),
          const Gap(AppSpacing.md),
          AppCard(
            padding: EdgeInsets.zero,
            child: Column(
              children: [
                ListTile(
                  leading: const AppIconBox(icon: Icons.info_outline),
                  title: const Text('Rows'),
                  subtitle: const Text('Separated by hairlines.'),
                  trailing: Icon(Icons.chevron_right, color: palette.textMuted),
                  onTap: () {},
                ),
                const Hairline(indent: AppSpacing.md, endIndent: AppSpacing.md),
                ListTile(
                  leading: const AppIconBox(icon: Icons.layers_outlined),
                  title: const Text('Icon box'),
                  subtitle: const Text('24px glyph, 40x40 muted square.'),
                  trailing: Icon(Icons.chevron_right, color: palette.textMuted),
                  onTap: () {},
                ),
              ],
            ),
          ),
          const Gap(AppSpacing.lg),
          AsyncValueView<String>(
            value: const AsyncValue<String>.loading(),
            data: (value) => Text(value),
          ),
          const Gap(AppSpacing.xl),
        ],
      ),
    );
  }

  void _replayReveal() => setState(() => _revealTick++);
}

/// A colour token: the swatch plus its token name in the quiet uppercase style.
class _Swatch extends StatelessWidget {
  const _Swatch({required this.label, required this.color});

  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final palette = context.palette;
    return SizedBox(
      width: 96,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            height: 44,
            decoration: BoxDecoration(
              color: color,
              borderRadius: AppRadius.smAll,
              border: Border.all(color: palette.border),
            ),
          ),
          const Gap(AppSpacing.xs),
          Text(
            label.toUpperCase(),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: AppTypography.sectionLabel(palette.textMuted),
          ),
        ],
      ),
    );
  }
}

/// The spacing rhythm as proportional bars.
class _SpaceScale extends StatelessWidget {
  const _SpaceScale();

  @override
  Widget build(BuildContext context) {
    final palette = context.palette;
    const tokens = <(String, double)>[
      ('xs 4', AppSpacing.xs),
      ('sm 8', AppSpacing.sm),
      ('md 16', AppSpacing.md),
      ('lg 24', AppSpacing.lg),
      ('xl 32', AppSpacing.xl),
      ('xxl 48', AppSpacing.xxl),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (final (label, value) in tokens) ...[
          Row(
            children: [
              SizedBox(
                width: 64,
                child: Text(
                  label.toUpperCase(),
                  style: AppTypography.sectionLabel(palette.textMuted),
                ),
              ),
              Expanded(
                child: Align(
                  alignment: AlignmentDirectional.centerStart,
                  child: Container(
                    width: value * 3,
                    height: 8,
                    decoration: BoxDecoration(
                      color: palette.accent,
                      borderRadius: AppRadius.smAll,
                    ),
                  ),
                ),
              ),
            ],
          ),
          const Gap(AppSpacing.sm),
        ],
      ],
    );
  }
}

/// A corner radius sample.
class _RadiusBox extends StatelessWidget {
  const _RadiusBox({required this.label, required this.radius});

  final String label;
  final double radius;

  @override
  Widget build(BuildContext context) {
    final palette = context.palette;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 72,
          height: 48,
          decoration: BoxDecoration(
            color: palette.bgMuted,
            borderRadius: BorderRadius.circular(radius),
            border: Border.all(color: palette.borderStrong),
          ),
        ),
        const Gap(AppSpacing.xs),
        Text(
          label.toUpperCase(),
          style: AppTypography.sectionLabel(palette.textMuted),
        ),
      ],
    );
  }
}

/// One row of the type scale: the token name and a live sample.
class _TypeSample extends StatelessWidget {
  const _TypeSample({required this.style, required this.name});

  final TextStyle? style;
  final String name;

  @override
  Widget build(BuildContext context) {
    final palette = context.palette;
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.baseline,
        textBaseline: TextBaseline.alphabetic,
        children: [
          SizedBox(
            width: 72,
            child: Text(
              name.toUpperCase(),
              style: AppTypography.sectionLabel(palette.textMuted),
            ),
          ),
          Expanded(
            child: Text(
              'Design systems',
              style: style,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }
}

/// The motion tokens plus a replayable [AppReveal].
class _MotionTokens extends StatelessWidget {
  const _MotionTokens({required this.revealTick, required this.onReplay});

  final int revealTick;
  final VoidCallback onReplay;

  @override
  Widget build(BuildContext context) {
    final palette = context.palette;
    final reduced = AppMotion.isReduced(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Gap(AppSpacing.sm),
        Text(
          reduced
              ? 'fast 150 · base 220 · enter 550 · REDUCED MOTION ON'
              : 'fast 150 · base 220 · enter 550 · cubic(0.16, 1, 0.3, 1)',
          style: AppTypography.sectionLabel(palette.textMuted),
        ),
        const Gap(AppSpacing.md),
        KeyedSubtree(
          key: ValueKey(revealTick),
          child: const AppReveal(
            child: AppCard(child: Text('12px travel, 550ms, ease-out-expo.')),
          ),
        ),
        const Gap(AppSpacing.sm),
        AppButton(
          label: 'Replay',
          onPressed: onReplay,
          variant: AppButtonVariant.text,
          icon: Icons.replay,
        ),
      ],
    );
  }
}
