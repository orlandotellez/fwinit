import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:fwiflu/core/error/failure.dart';
import 'package:fwiflu/core/theme/app_colors.dart';
import 'package:fwiflu/core/widgets/error_view.dart';
import 'package:fwiflu/l10n/failure_l10n.dart';

/// Renders an [AsyncValue] with consistent loading/error/data handling.
///
/// This removes the repetitive `when(data:, loading:, error:)` boilerplate
/// from every screen and gives the whole app a single, uniform look for
/// spinners and error states.
class AsyncValueView<T> extends StatelessWidget {
  const AsyncValueView({
    required this.value,
    required this.data,
    this.onRetry,
    super.key,
  });

  final AsyncValue<T> value;
  final Widget Function(T data) data;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    return value.when(
      // Keep showing the previous data while a refresh is in flight, so the
      // screen doesn't flash a full-screen spinner over existing content.
      skipLoadingOnRefresh: true,
      data: data,
      loading: () => Center(
        child: CircularProgressIndicator(
          strokeWidth: 2,
          color: context.palette.accent,
        ),
      ),
      error: (error, _) => ErrorView(
        message: error is Failure
            ? error.localizedMessage(context)
            : error.toString(),
        onRetry: onRetry,
      ),
    );
  }
}
