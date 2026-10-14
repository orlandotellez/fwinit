import 'package:fwiflu/core/utils/result.dart';
import 'package:fwiflu/features/posts/domain/entities/post.dart';

/// The contract the domain layer depends on.
///
/// The domain layer owns this interface; the data layer implements it. This
/// dependency inversion keeps business logic free of Dio, JSON and other
/// infrastructure concerns, and makes the domain trivial to test.
abstract interface class PostRepository {
  /// Fetches the list of posts.
  Future<Result<List<Post>>> getPosts();

  /// Fetches a single post by [id].
  Future<Result<Post>> getPost(int id);
}
