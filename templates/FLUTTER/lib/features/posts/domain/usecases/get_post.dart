import 'package:fwiflu/core/utils/result.dart';
import 'package:fwiflu/features/posts/domain/entities/post.dart';
import 'package:fwiflu/features/posts/domain/repositories/post_repository.dart';

/// Use case: retrieve a single post by id.
class GetPost {
  const GetPost(this._repository);

  final PostRepository _repository;

  Future<Result<Post>> call(int id) => _repository.getPost(id);
}
