import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:fwiflu/core/network/dio_client.dart';
import 'package:fwiflu/core/storage/key_value_store.dart';
import 'package:fwiflu/core/storage/secure_store.dart';

/// Cross-cutting infrastructure providers.
///
/// These are declared without code generation so the template works on a
/// wide range of SDK versions. Each provider is a single, obvious source of
/// truth that features depend on and tests override.

/// The shared [Dio] HTTP client.
final dioProvider = Provider<Dio>((ref) {
  final dio = DioClient.create();
  ref.onDispose(dio.close);
  return dio;
});

/// Non-sensitive key/value storage.
///
/// Overridden in [main] with a resolved async instance so the rest of the
/// app can depend on it synchronously.
final keyValueStoreProvider = Provider<KeyValueStore>((ref) {
  throw UnimplementedError(
    'keyValueStoreProvider must be overridden in main() with '
    'SharedPreferencesStore.create().',
  );
});

/// Encrypted storage for sensitive values (tokens, secrets).
final secureStoreProvider = Provider<SecureStore>(
  (ref) => FlutterSecureStore(),
);
