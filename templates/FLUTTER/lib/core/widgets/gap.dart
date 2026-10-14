import 'package:flutter/widgets.dart';

/// A lightweight spacing widget — a clearer alternative to `SizedBox`.
///
/// Use [Gap] inside a `Column` (vertical space) and [Gap.h] inside a `Row`
/// (horizontal space):
/// ```dart
/// Column(children: [WidgetA(), const Gap(AppSpacing.md), WidgetB()]);
/// Row(children: [Icon(...), const Gap.h(AppSpacing.sm), Text('...')]);
/// ```
class Gap extends StatelessWidget {
  /// Vertical space of [size] logical pixels.
  const Gap(this.size, {super.key}) : _horizontal = false;

  /// Horizontal space of [size] logical pixels.
  const Gap.h(this.size, {super.key}) : _horizontal = true;

  final double size;
  final bool _horizontal;

  @override
  Widget build(BuildContext context) => SizedBox(
    width: _horizontal ? size : null,
    height: _horizontal ? null : size,
  );
}
