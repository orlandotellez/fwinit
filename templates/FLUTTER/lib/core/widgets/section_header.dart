import 'package:flutter/material.dart';
import 'package:fwiflu/core/theme/app_colors.dart';
import 'package:fwiflu/core/theme/app_spacing.dart';
import 'package:fwiflu/core/theme/app_typography.dart';
import 'package:fwiflu/core/widgets/gap.dart';

/// A section label with an optional supporting line and trailing action.
///
/// The title renders as the design language's quiet uppercase label: 12sp,
/// w600, 0.12em tracking, faint text colour. It is decorative metadata used to
/// break long screens into labelled groups — never use it for body copy or for
/// anything the user must read in order to act.
class SectionHeader extends StatelessWidget {
  const SectionHeader({
    required this.title,
    this.subtitle,
    this.trailing,
    super.key,
  });

  final String title;
  final String? subtitle;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final palette = context.palette;
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title.toUpperCase(),
                  style: AppTypography.sectionLabel(palette.textFaint),
                ),
                if (subtitle != null) ...[
                  const Gap(AppSpacing.xs),
                  Text(
                    subtitle!,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: palette.textMuted,
                    ),
                  ),
                ],
              ],
            ),
          ),
          ?trailing,
        ],
      ),
    );
  }
}
