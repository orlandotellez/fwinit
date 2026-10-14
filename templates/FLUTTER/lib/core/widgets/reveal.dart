import 'package:flutter/material.dart';
import 'package:fwiflu/core/theme/app_motion.dart';

/// Fades and lifts [child] into place on first build.
///
/// Motion here is a breath, not a show: 12 logical pixels of travel over
/// 550ms on the house curve. When the platform asks for reduced motion the
/// child simply appears, and the page must still look finished.
class AppReveal extends StatelessWidget {
  /// Reveals [child] once, when it is first built.
  const AppReveal({required this.child, super.key});

  /// The content to reveal.
  final Widget child;

  @override
  Widget build(BuildContext context) => TweenAnimationBuilder<double>(
    tween: Tween<double>(begin: 0, end: 1),
    duration: AppMotion.duration(context, AppMotion.enter),
    curve: AppMotion.curve,
    builder: (context, value, child) => Opacity(
      opacity: value,
      child: Transform.translate(
        offset: Offset(0, (1 - value) * AppMotion.revealOffset),
        child: child,
      ),
    ),
    child: child,
  );
}
