import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:fwiflu/core/providers/core_providers.dart';
import 'package:fwiflu/core/utils/result.dart';
import 'package:fwiflu/features/posts/data/datasources/post_remote_data_source.dart';
import 'package:fwiflu/features/posts/data/repositories/post_repository_impl.dart';
import 'package:fwiflu/features/posts/domain/entities/post.dart';
import 'package:fwiflu/features/posts/domain/repositories/post_repository.dart';
import 'package:fwiflu/features/posts/domain/usecases/get_post.dart';
import 'package:fwiflu/features/posts/domain/usecases/get_posts.dart';

/// Dependency wiring for the posts feature.
///
/// Each layer is exposed as a provider so it can be overridden in tests or
/// swapped for a different implementation. This is the composition root for
/// the feature.

final postRemoteDataSourceProvider = Provider<PostRemoteDataSource>((ref) {
  return PostRemoteDataSourceImpl(ref.watch(dioProvider));
});

final postRepositoryProvider = Provider<PostRepository>((ref) {
  return PostRepositoryImpl(ref.watch(postRemoteDataSourceProvider));
});

final getPostsProvider = Provider<GetPosts>((ref) {
  return GetPosts(ref.watch(postRepositoryProvider));
});

final getPostProvider = Provider<GetPost>((ref) {
  return GetPost(ref.watch(postRepositoryProvider));
});

/// Holds the async state of the posts list and exposes a [refresh] action.
///
/// The controller unwraps the domain [Result]: a [Failure] is surfaced as an
/// error state (so the UI can react), and success as data.
class PostsController extends AsyncNotifier<List<Post>> {
  @override
  Future<List<Post>> build() => _load();

  Future<List<Post>> _load() async {
    final getPosts = ref.read(getPostsProvider);
    final result = await getPosts();
    return switch (result) {
      Ok<List<Post>>(:final value) => value,
      Err<List<Post>>(:final failure) => throw failure,
    };
  }

  /// Re-fetches the posts.
  ///
  /// [AsyncValue.guard] transitions to loading while preserving the previous
  /// data (Riverpod's `copyWithPrevious`), so pull-to-refresh keeps the list
  /// visible instead of flashing a full-screen spinner.
  Future<void> refresh() async {
    state = await AsyncValue.guard(_load);
  }
}

final postsControllerProvider =
    AsyncNotifierProvider<PostsController, List<Post>>(PostsController.new);

/// Loads a single post by id for the detail screen.
///
/// A `family` parameterizes the provider by post id; `autoDispose` frees the
/// state when the detail screen is popped.
final postDetailProvider = FutureProvider.autoDispose.family<Post, int>((
  ref,
  id,
) async {
  final result = await ref.watch(getPostProvider)(id);
  return switch (result) {
    Ok<Post>(:final value) => value,
    Err<Post>(:final failure) => throw failure,
  };
});
