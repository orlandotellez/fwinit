import 'package:dio/dio.dart';
import 'package:fwiflu/core/error/exceptions.dart';
import 'package:fwiflu/features/posts/data/models/post_dto.dart';

/// Talks to the remote API and returns raw DTOs.
///
/// Data sources are the only place that knows about Dio and endpoints. They
/// throw typed [Exception]s on failure; mapping to domain [Failure]s happens
/// one layer up, in the repository.
abstract interface class PostRemoteDataSource {
  Future<List<PostDto>> fetchPosts();
  Future<PostDto> fetchPost(int id);
}

class PostRemoteDataSourceImpl implements PostRemoteDataSource {
  const PostRemoteDataSourceImpl(this._dio);

  final Dio _dio;

  @override
  Future<List<PostDto>> fetchPosts() async {
    final response = await _guard(() => _dio.get<List<dynamic>>('/posts'));
    try {
      return (response.data ?? [])
          .cast<Map<String, dynamic>>()
          .map(PostDto.fromJson)
          .toList();
    } catch (e, s) {
      throw ParsingException('Failed to parse posts', (e, s));
    }
  }

  @override
  Future<PostDto> fetchPost(int id) async {
    final response = await _guard(
      () => _dio.get<Map<String, dynamic>>('/posts/$id'),
    );
    try {
      return PostDto.fromJson(response.data!);
    } catch (e, s) {
      throw ParsingException('Failed to parse post $id', (e, s));
    }
  }

  /// Runs a Dio call, translating transport/HTTP problems into typed
  /// exceptions the repository knows how to map.
  Future<Response<T>> _guard<T>(Future<Response<T>> Function() call) async {
    final Response<T> response;
    try {
      response = await call();
    } on DioException catch (e) {
      if (e.type == DioExceptionType.connectionTimeout ||
          e.type == DioExceptionType.receiveTimeout ||
          e.type == DioExceptionType.sendTimeout ||
          e.type == DioExceptionType.connectionError) {
        throw NetworkException(e.message ?? 'Network error', e);
      }
      throw ServerException(
        statusCode: e.response?.statusCode,
        message: e.message ?? 'Server error',
        cause: e,
      );
    }

    final status = response.statusCode ?? 0;
    if (status < 200 || status >= 300) {
      throw ServerException(
        statusCode: status,
        message: 'Request failed with status $status',
      );
    }
    return response;
  }
}
