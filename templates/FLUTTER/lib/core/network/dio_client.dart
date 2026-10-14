import 'package:dio/dio.dart';
import 'package:fwiflu/core/config/app_config.dart';
import 'package:fwiflu/core/network/logging_interceptor.dart';

/// Builds a configured [Dio] instance for the app.
///
/// Centralizing Dio construction keeps timeouts, base URL, headers and
/// interceptors consistent, and makes the client trivial to override in
/// tests (see `test/` for examples that inject a mock adapter).
abstract final class DioClient {
  static Dio create({List<Interceptor>? interceptors}) {
    final dio = Dio(
      BaseOptions(
        baseUrl: AppConfig.apiBaseUrl,
        connectTimeout: const Duration(milliseconds: AppConfig.apiTimeoutMs),
        receiveTimeout: const Duration(milliseconds: AppConfig.apiTimeoutMs),
        sendTimeout: const Duration(milliseconds: AppConfig.apiTimeoutMs),
        headers: const {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        // Let us handle non-2xx responses ourselves instead of throwing
        // opaque DioExceptions for every status code.
        validateStatus: (status) => status != null && status < 500,
      ),
    );

    dio.interceptors.addAll([
      ...?interceptors,
      if (AppConfig.enableLogging) LoggingInterceptor(),
    ]);

    return dio;
  }
}
