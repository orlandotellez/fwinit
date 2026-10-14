import 'package:flutter/material.dart';
import 'package:fwiflu/core/theme/app_colors.dart';

/// Wraps [child] and, while [isLoading] is true, dims it behind a modal
/// spinner and blocks interaction.
///
/// Handy for submit flows: keep the form visible but prevent taps while a
/// request is in flight. The scrim is the base surface at 72% rather than a
/// black veil, so the screen keeps its brightness in both themes.
class LoadingOverlay extends StatelessWidget {
  const LoadingOverlay({
    required this.isLoading,
    required this.child,
    super.key,
  });

  final bool isLoading;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        child,
        if (isLoading)
          Positioned.fill(
            child: ColoredBox(
              color: context.palette.bgBase.withValues(alpha: 0.72),
              child: const Center(
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
            ),
          ),
      ],
    );
  }
}
