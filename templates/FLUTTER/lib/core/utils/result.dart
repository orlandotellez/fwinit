import 'package:fwiflu/core/error/failure.dart';

/// A lightweight functional result type used across the app.
///
/// Prefer returning a [Result] over throwing across architectural
/// boundaries (repositories, use cases). This makes error handling
/// explicit and forces callers to consider the failure path.
///
/// Example:
/// ```dart
/// final result = await getPosts();
/// result.when(
///   ok: (posts) => render(posts),
///   err: (failure) => showError(failure.message),
/// );
/// ```
sealed class Result<T> {
  const Result();

  /// Creates a successful result holding [value].
  const factory Result.ok(T value) = Ok<T>;

  /// Creates a failed result holding [failure].
  const factory Result.err(Failure failure) = Err<T>;

  /// Whether this result represents success.
  bool get isOk => this is Ok<T>;

  /// Whether this result represents failure.
  bool get isErr => this is Err<T>;

  /// The value if successful, otherwise `null`.
  T? get valueOrNull => switch (this) {
    Ok<T>(:final value) => value,
    Err<T>() => null,
  };

  /// The failure if failed, otherwise `null`.
  Failure? get failureOrNull => switch (this) {
    Ok<T>() => null,
    Err<T>(:final failure) => failure,
  };

  /// Exhaustively handles both branches, returning a value of type [R].
  R when<R>({
    required R Function(T value) ok,
    required R Function(Failure failure) err,
  }) {
    return switch (this) {
      Ok<T>(:final value) => ok(value),
      Err<T>(:final failure) => err(failure),
    };
  }

  /// Transforms the success value while preserving a failure.
  Result<R> map<R>(R Function(T value) transform) {
    return switch (this) {
      Ok<T>(:final value) => Result.ok(transform(value)),
      Err<T>(:final failure) => Result.err(failure),
    };
  }
}

/// The success branch of a [Result].
final class Ok<T> extends Result<T> {
  const Ok(this.value);

  final T value;

  @override
  bool operator ==(Object other) =>
      identical(this, other) || (other is Ok<T> && other.value == value);

  @override
  int get hashCode => value.hashCode;

  @override
  String toString() => 'Ok($value)';
}

/// The failure branch of a [Result].
final class Err<T> extends Result<T> {
  const Err(this.failure);

  final Failure failure;

  @override
  bool operator ==(Object other) =>
      identical(this, other) || (other is Err<T> && other.failure == failure);

  @override
  int get hashCode => failure.hashCode;

  @override
  String toString() => 'Err($failure)';
}
