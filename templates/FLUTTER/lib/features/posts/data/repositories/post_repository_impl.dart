import 'package:fwiflu/core/error/exceptions.dart';
import 'package:fwiflu/core/error/failure.dart';
import 'package:fwiflu/core/utils/app_logger.dart';
import 'package:fwiflu/core/utils/result.dart';
import 'package:fwiflu/features/posts/data/datasources/post_remote_data_source.dart';
import 'package:fwiflu/features/posts/domain/entities/post.dart';
import 'package:fwiflu/features/posts/domain/repositories/post_repository.dart';

/// Concrete [PostRepository] backed by a remote data source.
///
/// Its job is error translation and mapping: catch data-layer [Exception]s,
/// convert them to domain [Failure]s, and map DTOs to entities. Callers only
/// ever see a [Result] of pure domain types.
class PostRepositoryImpl implements PostRepository {
  const PostRepositoryImpl(this._remote);

  final PostRemoteDataSource _remote;

  @override
  Future<Result<List<Post>>> getPosts() {
    return _run(() async {
      final dtos = await _remote.fetchPosts();
      return dtos.map((dto) => dto.toEntity()).toList();
    });
  }

  @override
  Future<Result<Post>> getPost(int id) {
    return _run(() async {
      final dto = await _remote.fetchPost(id);
      return dto.toEntity();
    });
  }

  /// Executes [action], mapping known exceptions to [Failure]s.
  Future<Result<T>> _run<T>(Future<T> Function() action) async {
    try {
      return Result.ok(await action());
    } on NetworkException catch (e) {
      return Result.err(NetworkFailure(cause: e.cause));
    } on ServerException catch (e) {
      return Result.err(
        ServerFailure(statusCode: e.statusCode, cause: e.cause),
      );
    } on ParsingException catch (e) {
      return Result.err(DataFailure(cause: e.cause));
    } catch (e, s) {
      AppLogger.instance.e(
        'Unexpected repository error',
        error: e,
        stackTrace: s,
      );
      return Result.err(UnknownFailure(cause: e));
    }
  }
}
