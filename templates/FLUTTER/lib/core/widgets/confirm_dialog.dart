import 'package:flutter/material.dart';
import 'package:fwiflu/core/theme/app_colors.dart';

/// Shows a standard confirmation dialog and resolves to `true` when the user
/// confirms, `false` (or `null` coerced to `false`) otherwise.
///
/// The surface is the elevated one with a hairline ring and the single overlay
/// shadow the design language allows.
///
/// ```dart
/// final ok = await showConfirmDialog(
///   context,
///   title: 'Log out?',
///   message: 'You will need to sign in again.',
///   confirmLabel: 'Log out',
///   cancelLabel: 'Cancel',
///   isDestructive: true,
/// );
/// ```
Future<bool> showConfirmDialog(
  BuildContext context, {
  required String title,
  required String message,
  required String confirmLabel,
  required String cancelLabel,
  bool isDestructive = false,
}) async {
  final palette = context.palette;
  final brightness = Theme.of(context).brightness;
  // In the light theme the destructive fill is a deep red that needs white
  // text; in the dark theme it is a light red that needs dark text.
  final onDanger = brightness == Brightness.light
      ? palette.bgElevated
      : palette.bgBase;
  final barrier = brightness == Brightness.light
      ? palette.textPrimary.withValues(alpha: 0.40)
      : Colors.black.withValues(alpha: 0.60);

  final result = await showDialog<bool>(
    context: context,
    barrierColor: barrier,
    builder: (context) => AlertDialog(
      title: Text(title),
      content: Text(
        message,
        style: Theme.of(
          context,
        ).textTheme.bodyMedium?.copyWith(color: palette.textMuted),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(false),
          child: Text(cancelLabel),
        ),
        FilledButton(
          style: isDestructive
              ? FilledButton.styleFrom(
                  backgroundColor: palette.danger,
                  foregroundColor: onDanger,
                )
              : null,
          onPressed: () => Navigator.of(context).pop(true),
          child: Text(confirmLabel),
        ),
      ],
    ),
  );
  return result ?? false;
}
