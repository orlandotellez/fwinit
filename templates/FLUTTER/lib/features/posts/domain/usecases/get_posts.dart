import 'package:fwiflu/core/utils/result.dart';
import 'package:fwiflu/features/posts/domain/entities/post.dart';
import 'package:fwiflu/features/posts/domain/repositories/post_repository.dart';

/// Use case: retrieve all posts.
///
/// Use cases model a single unit of business logic. They are thin here, but
/// give you a natural home for orchestration (combining repositories,
/// filtering, sorting, business rules) as the app grows — without bloating
/// controllers or repositories.
class GetPosts {
  const GetPosts(this._repository);

  final PostRepository _repository;

  Future<Result<List<Post>>> call() async {
    final result = await _repository.getPosts();
    // Example of a business rule living in the domain layer: newest first.
    return result.map(
      (posts) => [...posts]..sort((a, b) => b.id.compareTo(a.id)),
    );
  }
}
