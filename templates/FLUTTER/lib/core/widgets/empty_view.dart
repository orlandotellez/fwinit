import 'package:flutter/material.dart';
import 'package:fwiflu/core/theme/app_colors.dart';
import 'package:fwiflu/core/theme/app_spacing.dart';
import 'package:fwiflu/core/widgets/app_button.dart';
import 'package:fwiflu/core/widgets/app_icon_box.dart';
import 'package:fwiflu/core/widgets/gap.dart';

/// A centered empty-state placeholder with an optional call to action.
///
/// The counterpart to `ErrorView`: use it when a request succeeds but there is
/// simply nothing to show. The icon stays neutral on purpose — an empty list is
/// not a problem, so it never borrows the danger colour.
class EmptyView extends StatelessWidget {
  const EmptyView({
    required this.message,
    this.icon = Icons.inbox_outlined,
    this.actionLabel,
    this.onAction,
    super.key,
  });

  final String message;
  final IconData icon;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    final palette = context.palette;
    final theme = Theme.of(context);

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.lg),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            AppIconBox(icon: icon, color: palette.textMuted),
            const Gap(AppSpacing.md),
            Text(
              message,
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyLarge?.copyWith(
                color: palette.textMuted,
              ),
            ),
            if (actionLabel != null && onAction != null) ...[
              const Gap(AppSpacing.lg),
              AppButton(
                label: actionLabel!,
                onPressed: onAction,
                variant: AppButtonVariant.secondary,
              ),
            ],
          ],
        ),
      ),
    );
  }
}
