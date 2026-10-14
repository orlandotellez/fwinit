import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:fwiflu/core/theme/app_colors.dart';
import 'package:fwiflu/core/theme/app_spacing.dart';
import 'package:fwiflu/core/theme/theme_controller.dart';
import 'package:fwiflu/core/widgets/widgets.dart';
import 'package:fwiflu/features/auth/presentation/auth_controller.dart';
import 'package:fwiflu/l10n/l10n.dart';

/// The "Profile" tab.
///
/// Shows placeholder account info, the **theme mode selector** (system / light
/// / dark, persisted) and a logout action, and demonstrates several kit widgets
/// (`AppAvatar`, `AppCard`, `SectionHeader`, `Hairline`, the confirm dialog and
/// the snackbar helper).
class ProfilePage extends ConsumerWidget {
  const ProfilePage({super.key});

  Future<void> _logout(BuildContext context, WidgetRef ref) async {
    final l10n = context.l10n;
    final confirmed = await showConfirmDialog(
      context,
      title: l10n.logoutConfirmTitle,
      message: l10n.logoutConfirmMessage,
      confirmLabel: l10n.logout,
      cancelLabel: l10n.cancel,
      isDestructive: true,
    );
    if (!confirmed) return;
    ref.read(authControllerProvider.notifier).logout();
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final palette = context.palette;
    final theme = Theme.of(context);
    final themeMode = ref.watch(themeModeProvider);

    return Scaffold(
      appBar: AppBar(title: Text(l10n.tabProfile)),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.md),
        children: [
          AppCard(
            child: Row(
              children: [
                const AppAvatar(name: 'Demo User', radius: 28),
                const Gap.h(AppSpacing.md),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(l10n.guestName, style: theme.textTheme.titleMedium),
                      Text(
                        l10n.guestEmail,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: palette.textMuted,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const Gap(AppSpacing.xl),
          SectionHeader(
            title: l10n.profileAppearanceSection,
            subtitle: l10n.themeModeSubtitle,
          ),
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const AppIconBox(icon: Icons.brightness_6_outlined),
                    const Gap.h(AppSpacing.md),
                    Expanded(
                      child: Text(
                        l10n.themeModeLabel,
                        style: theme.textTheme.titleMedium,
                      ),
                    ),
                  ],
                ),
                const Gap(AppSpacing.md),
                SizedBox(
                  width: double.infinity,
                  child: SegmentedButton<ThemeMode>(
                    showSelectedIcon: false,
                    segments: [
                      ButtonSegment<ThemeMode>(
                        value: ThemeMode.system,
                        label: Text(l10n.themeSystem),
                      ),
                      ButtonSegment<ThemeMode>(
                        value: ThemeMode.light,
                        label: Text(l10n.themeLight),
                      ),
                      ButtonSegment<ThemeMode>(
                        value: ThemeMode.dark,
                        label: Text(l10n.themeDark),
                      ),
                    ],
                    selected: {themeMode},
                    onSelectionChanged: (selection) => ref
                        .read(themeModeProvider.notifier)
                        .set(selection.first),
                  ),
                ),
              ],
            ),
          ),
          const Gap(AppSpacing.xl),
          SectionHeader(title: l10n.profileAccountSection),
          AppCard(
            padding: EdgeInsets.zero,
            child: Column(
              children: [
                ListTile(
                  leading: const Icon(Icons.notifications_outlined),
                  title: Text(l10n.profileNotifications),
                  trailing: Switch(value: true, onChanged: (_) {}),
                ),
                const Hairline(indent: AppSpacing.md, endIndent: AppSpacing.md),
                ListTile(
                  leading: const Icon(Icons.info_outline),
                  title: Text(l10n.profileAbout),
                  subtitle: Text(l10n.profileAboutBody),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => context.showSnackBar(l10n.comingSoon),
                ),
              ],
            ),
          ),
          const Gap(AppSpacing.xl),
          AppButton(
            label: l10n.logout,
            onPressed: () => _logout(context, ref),
            variant: AppButtonVariant.outline,
            icon: Icons.logout,
            expanded: true,
          ),
        ],
      ),
    );
  }
}
