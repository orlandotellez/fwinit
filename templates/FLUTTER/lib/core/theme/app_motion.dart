import 'package:flutter/widgets.dart';

/// Motion tokens for the fwiflu design language.
///
/// "Minimal editorial dual" moves less than other styles: a 12px reveal, a
/// border darkening on hover, and nothing else. No glows, no pulses, no
/// continuous animation.
///
/// Every duration must go through [duration] so the whole app honours the
/// platform "reduce motion" accessibility setting.
abstract final class AppMotion {
  /// Micro-transitions: hover, press, focus.
  static const Duration fast = Duration(milliseconds: 150);

  /// Standard state change.
  static const Duration base = Duration(milliseconds: 220);

  /// Entrance and reveal.
  static const Duration enter = Duration(milliseconds: 550);

  /// The house easing curve (ease-out-expo flavoured).
  static const Curve curve = Cubic(0.16, 1, 0.3, 1);

  /// How far content travels while revealing, in logical pixels.
  static const double revealOffset = 12;

  /// Whether the platform asks for reduced motion.
  static bool isReduced(BuildContext context) =>
      MediaQuery.maybeDisableAnimationsOf(context) ?? false;

  /// Collapses [value] to zero when reduced motion is on.
  static Duration duration(BuildContext context, Duration value) =>
      isReduced(context) ? Duration.zero : value;
}
