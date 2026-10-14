import 'package:dio/dio.dart';
import 'package:fwiflu/core/utils/app_logger.dart';

/// Logs outgoing requests and incoming responses/errors.
///
/// Kept intentionally simple. In a real app you would also add an
/// `AuthInterceptor` that attaches tokens and refreshes them on 401.
class LoggingInterceptor extends Interceptor {
  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    AppLogger.instance.d('→ ${options.method} ${options.uri}');
    handler.next(options);
  }

  @override
  void onResponse(
    Response<dynamic> response,
    ResponseInterceptorHandler handler,
  ) {
    AppLogger.instance.d(
      '← ${response.statusCode} ${response.requestOptions.uri}',
    );
    handler.next(response);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    AppLogger.instance.w(
      '✗ ${err.requestOptions.method} ${err.requestOptions.uri} '
      '(${err.type.name})',
    );
    handler.next(err);
  }
}
