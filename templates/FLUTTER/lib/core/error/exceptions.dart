/// Low-level exceptions thrown inside the data layer.
///
/// These are implementation details and must never leak into the
/// presentation layer. Repositories catch them and map them to
/// [Failure]s (see `failure.dart`).
library;

/// Thrown when a network request cannot reach the server.
class NetworkException implements Exception {
  const NetworkException([this.message = 'Network error', this.cause]);

  final String message;
  final Object? cause;

  @override
  String toString() => 'NetworkException: $message';
}

/// Thrown when the server responds with a non-2xx status code.
class ServerException implements Exception {
  const ServerException({
    this.statusCode,
    this.message = 'Server error',
    this.cause,
  });

  final int? statusCode;
  final String message;
  final Object? cause;

  @override
  String toString() => 'ServerException($statusCode): $message';
}

/// Thrown when a payload cannot be parsed into the expected shape.
class ParsingException implements Exception {
  const ParsingException([
    this.message = 'Failed to parse response',
    this.cause,
  ]);

  final String message;
  final Object? cause;

  @override
  String toString() => 'ParsingException: $message';
}

/// Thrown when a local storage operation fails.
class CacheException implements Exception {
  const CacheException([this.message = 'Cache error', this.cause]);

  final String message;
  final Object? cause;

  @override
  String toString() => 'CacheException: $message';
}
