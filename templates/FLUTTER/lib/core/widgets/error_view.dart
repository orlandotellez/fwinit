import 'package:flutter/material.dart';
import 'package:fwiflu/core/theme/app_colors.dart';
import 'package:fwiflu/core/theme/app_spacing.dart';
import 'package:fwiflu/core/widgets/app_button.dart';
import 'package:fwiflu/core/widgets/app_icon_box.dart';
import 'package:fwiflu/core/widgets/gap.dart';
import 'package:fwiflu/l10n/l10n.dart';

/// A reusable, centered error state with an optional retry action.
///
/// This is the one place the danger colour is spent outside destructive
/// actions, because here it carries meaning.
class ErrorView extends StatelessWidget {
  const ErrorView({required this.message, this.onRetry, super.key});

  final String message;
  final VoidCallback? onRetry;

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
            AppIconBox(icon: Icons.error_outline, color: palette.danger),
            const Gap(AppSpacing.md),
            Text(
              message,
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyLarge,
            ),
            if (onRetry != null) ...[
              const Gap(AppSpacing.lg),
              AppButton(
                label: context.l10n.retry,
                onPressed: onRetry,
                variant: AppButtonVariant.outline,
                icon: Icons.refresh,
              ),
            ],
          ],
        ),
      ),
    );
  }
}
