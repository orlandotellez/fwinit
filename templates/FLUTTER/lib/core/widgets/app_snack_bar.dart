import 'package:flutter/material.dart';
import 'package:fwiflu/core/theme/app_colors.dart';
import 'package:fwiflu/core/theme/app_spacing.dart';
import 'package:fwiflu/core/widgets/gap.dart';

/// Semantic flavor of a snackbar.
enum SnackType { info, success, error }

/// Convenience helpers for showing consistent snackbars.
///
/// Feedback keeps the neutral hairline surface and carries its meaning in the
/// icon colour — colour is never decoration.
///
/// Usage: `context.showSnackBar('Saved', type: SnackType.success);`
extension AppSnackBar on BuildContext {
  void showSnackBar(String message, {SnackType type = SnackType.info}) {
    final theme = Theme.of(this);
    final palette = theme.extension<AppPalette>()!;
    final (color, icon) = switch (type) {
      SnackType.info => (palette.info, Icons.info_outline),
      SnackType.success => (palette.success, Icons.check_circle_outline),
      SnackType.error => (palette.danger, Icons.error_outline),
    };

    ScaffoldMessenger.of(this)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Row(
            children: [
              Icon(icon, size: 20, color: color),
              const Gap.h(AppSpacing.sm),
              Expanded(child: Text(message, style: theme.textTheme.bodyMedium)),
            ],
          ),
        ),
      );
  }
}
