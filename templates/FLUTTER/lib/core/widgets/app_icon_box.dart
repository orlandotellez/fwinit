import 'package:flutter/material.dart';
import 'package:fwiflu/core/theme/app_colors.dart';
import 'package:fwiflu/core/theme/app_spacing.dart';

/// A 24px icon inside a 40x40 muted rounded square.
///
/// This is the design language's icon container: quiet, flat, no illustration
/// panel and no gradient. Pass [color] when the icon carries meaning (for
/// example the danger colour on an error state); it defaults to the accent.
class AppIconBox extends StatelessWidget {
  const AppIconBox({
    required this.icon,
    this.size = 40,
    this.iconSize = 24,
    this.color,
    super.key,
  });

  /// The icon to render.
  final IconData icon;

  /// Side length of the square.
  final double size;

  /// Glyph size. The house value is 24.
  final double iconSize;

  /// Glyph colour. Defaults to the palette accent.
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final palette = context.palette;
    return Container(
      width: size,
      height: size,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: palette.bgMuted,
        borderRadius: AppRadius.smAll,
      ),
      child: Icon(icon, size: iconSize, color: color ?? palette.accent),
    );
  }
}
