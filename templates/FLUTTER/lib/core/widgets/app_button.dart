import 'package:flutter/material.dart';
import 'package:fwiflu/core/theme/app_colors.dart';
import 'package:fwiflu/core/theme/app_spacing.dart';
import 'package:fwiflu/core/widgets/gap.dart';

/// Visual style of an [AppButton].
enum AppButtonVariant {
  /// Filled with the accent. Reserve it for the single main action on screen.
  primary,

  /// Silent: transparent with a hairline border. The default companion action.
  secondary,

  /// Accent hairline border and accent label.
  outline,

  /// No border, accent label. For inline and tertiary actions.
  text,
}

/// The app's standard button.
///
/// Wraps Material's button family behind one API so every button in the app
/// shares sizing, loading behaviour and icon handling. When [isLoading] is true
/// the button is disabled and shows a spinner in place of its label.
class AppButton extends StatelessWidget {
  const AppButton({
    required this.label,
    required this.onPressed,
    this.variant = AppButtonVariant.primary,
    this.icon,
    this.isLoading = false,
    this.expanded = false,
    super.key,
  });

  final String label;
  final VoidCallback? onPressed;
  final AppButtonVariant variant;
  final IconData? icon;
  final bool isLoading;

  /// When true, the button stretches to the full available width.
  final bool expanded;

  @override
  Widget build(BuildContext context) {
    final palette = context.palette;
    final effectiveOnPressed = isLoading ? null : onPressed;
    final child = _buildChild(context);

    final button = switch (variant) {
      AppButtonVariant.primary => FilledButton(
        onPressed: effectiveOnPressed,
        child: child,
      ),
      AppButtonVariant.secondary => OutlinedButton(
        onPressed: effectiveOnPressed,
        child: child,
      ),
      AppButtonVariant.outline => OutlinedButton(
        onPressed: effectiveOnPressed,
        style: _outlineStyle(palette),
        child: child,
      ),
      AppButtonVariant.text => TextButton(
        onPressed: effectiveOnPressed,
        child: child,
      ),
    };

    return expanded ? SizedBox(width: double.infinity, child: button) : button;
  }

  Widget _buildChild(BuildContext context) {
    if (isLoading) {
      // A loading button is disabled, so its surface is bgMuted: the spinner
      // must be the accent, not the on-accent foreground.
      return SizedBox(
        height: 20,
        width: 20,
        child: CircularProgressIndicator(
          strokeWidth: 2,
          color: context.palette.accent,
        ),
      );
    }
    if (icon == null) return Text(label);
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [Icon(icon, size: 20), const Gap.h(AppSpacing.sm), Text(label)],
    );
  }

  /// The accent-bordered variant, with the house 2px focus ring.
  static ButtonStyle _outlineStyle(AppPalette palette) =>
      OutlinedButton.styleFrom(
        foregroundColor: palette.accent,
        minimumSize: const Size(64, 48),
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
        shape: const RoundedRectangleBorder(borderRadius: AppRadius.mdAll),
      ).copyWith(
        side: WidgetStateProperty.resolveWith<BorderSide?>(
          (states) => states.contains(WidgetState.focused)
              ? BorderSide(color: palette.accent, width: 2)
              : BorderSide(color: palette.accent),
        ),
        overlayColor: WidgetStatePropertyAll<Color?>(palette.accentSoft),
      );
}
