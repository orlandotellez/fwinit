import 'package:flutter/material.dart';
import 'package:fwiflu/core/theme/app_colors.dart';
import 'package:fwiflu/core/theme/app_motion.dart';
import 'package:fwiflu/core/theme/app_spacing.dart';

/// A padded surface with the app's card styling and an optional tap action.
///
/// Elevation is expressed as surface contrast plus a hairline border, never as
/// a shadow. On hover or press the border strengthens to
/// [AppPalette.borderStrong] over [AppMotion.base]; that is the only affordance.
class AppCard extends StatefulWidget {
  const AppCard({
    required this.child,
    this.onTap,
    this.padding = AppSpacing.page,
    super.key,
  });

  final Widget child;
  final VoidCallback? onTap;
  final EdgeInsetsGeometry padding;

  @override
  State<AppCard> createState() => _AppCardState();
}

class _AppCardState extends State<AppCard> {
  bool _hovered = false;
  bool _pressed = false;

  bool get _interactive => widget.onTap != null;

  bool get _emphasised => _interactive && (_hovered || _pressed);

  @override
  Widget build(BuildContext context) {
    final palette = context.palette;

    return MouseRegion(
      onEnter: (_) => _setHovered(true),
      onExit: (_) => _setHovered(false),
      child: AnimatedContainer(
        duration: AppMotion.duration(context, AppMotion.base),
        curve: AppMotion.curve,
        decoration: BoxDecoration(
          color: palette.bgElevated,
          borderRadius: AppRadius.mdAll,
          border: Border.all(
            color: _emphasised ? palette.borderStrong : palette.border,
          ),
        ),
        child: Material(
          type: MaterialType.transparency,
          borderRadius: AppRadius.mdAll,
          clipBehavior: Clip.antiAlias,
          child: InkWell(
            onTap: widget.onTap,
            onTapDown: (_) => _setPressed(true),
            onTapUp: (_) => _setPressed(false),
            onTapCancel: () => _setPressed(false),
            overlayColor: WidgetStatePropertyAll<Color?>(palette.accentSoft),
            child: Padding(padding: widget.padding, child: widget.child),
          ),
        ),
      ),
    );
  }

  void _setHovered(bool value) {
    if (!_interactive || _hovered == value) return;
    setState(() => _hovered = value);
  }

  void _setPressed(bool value) {
    if (!_interactive || _pressed == value) return;
    setState(() => _pressed = value);
  }
}
