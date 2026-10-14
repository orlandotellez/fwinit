/// Domain-level failures.
///
/// Failures are the "safe" representation of errors that cross into the
/// presentation layer. Low-level [Exception]s (see `exceptions.dart`) are
/// caught in the data layer and mapped to one of these types.
sealed class Failure {
  const Failure({required this.message, this.cause});

  /// A human-readable, user-safe message.
  final String message;

  /// The original error, kept for logging (never shown to users).
  final Object? cause;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is Failure &&
          other.runtimeType == runtimeType &&
          other.message == message);

  @override
  int get hashCode => Object.hash(runtimeType, message);

  @override
  String toString() => '$runtimeType(message: $message, cause: $cause)';
}

/// A failure caused by connectivity issues (timeouts, no internet).
final class NetworkFailure extends Failure {
  const NetworkFailure({
    super.message = 'No internet connection. Please try again.',
    super.cause,
  });
}

/// A failure returned by the server (non-2xx responses).
final class ServerFailure extends Failure {
  const ServerFailure({
    super.message = 'Something went wrong on our end.',
    this.statusCode,
    super.cause,
  });

  /// The HTTP status code, when available.
  final int? statusCode;
}

/// A failure caused by invalid or unexpected data (parsing errors).
final class DataFailure extends Failure {
  const DataFailure({super.message = 'Received unexpected data.', super.cause});
}

/// A failure caused by local storage/cache operations.
final class CacheFailure extends Failure {
  const CacheFailure({
    super.message = 'Could not read local data.',
    super.cause,
  });
}

/// A failure for anything not covered by the cases above.
final class UnknownFailure extends Failure {
  const UnknownFailure({
    super.message = 'An unexpected error occurred.',
    super.cause,
  });
}
