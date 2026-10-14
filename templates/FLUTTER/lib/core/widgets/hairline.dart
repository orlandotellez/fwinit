import 'package:flutter/widgets.dart';
import 'package:fwiflu/core/theme/app_colors.dart';
import 'package:fwiflu/core/theme/app_spacing.dart';

/// A 1px horizontal rule in the border colour.
///
/// Surfaces in this design language separate through hairlines rather than
/// shadows, so prefer [Hairline] over [Divider] inside the app's own layouts.
class Hairline extends StatelessWidget {
  /// A full-bleed rule.
  const Hairline({this.indent = 0, this.endIndent = 0, super.key});

  /// Leading inset, in logical pixels.
  final double indent;

  /// Trailing inset, in logical pixels.
  final double endIndent;

  @override
  Widget build(BuildContext context) => Container(
    height: AppStroke.hairline,
    margin: EdgeInsetsDirectional.only(start: indent, end: endIndent),
    color: context.palette.border,
  );
}
