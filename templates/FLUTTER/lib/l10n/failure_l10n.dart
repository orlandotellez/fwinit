import 'package:flutter/widgets.dart';
import 'package:fwiflu/core/error/failure.dart';
import 'package:fwiflu/l10n/l10n.dart';

/// Bridges the pure-domain [Failure] hierarchy to localized, user-facing text.
///
/// The domain layer stays free of Flutter/l10n (its `Failure.message` is only
/// for logging). The presentation layer calls [localizedMessage] to render an
/// appropriate, translated message. The `switch` is exhaustive because
/// [Failure] is `sealed` — add a new failure type and the compiler forces you
/// to localize it here.
extension FailureL10n on Failure {
  String localizedMessage(BuildContext context) {
    final l10n = context.l10n;
    return switch (this) {
      NetworkFailure() => l10n.errorNetwork,
      ServerFailure() => l10n.errorServer,
      DataFailure() => l10n.errorData,
      CacheFailure() => l10n.errorCache,
      UnknownFailure() => l10n.errorUnknown,
    };
  }
}
