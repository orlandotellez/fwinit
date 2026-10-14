import 'package:flutter_test/flutter_test.dart';
import 'package:fwiflu/core/error/failure.dart';
import 'package:fwiflu/core/utils/result.dart';
import 'package:fwiflu/features/posts/domain/entities/post.dart';
import 'package:fwiflu/features/posts/domain/repositories/post_repository.dart';
import 'package:fwiflu/features/posts/presentation/pages/post_detail_page.dart';
import 'package:fwiflu/features/posts/presentation/providers/posts_providers.dart';

import '../../../support/pump_app.dart';

class _FakeRepo implements PostRepository {
  _FakeRepo(this._post);
  final Result<Post> _post;

  @override
  Future<Result<Post>> getPost(int id) async => _post;

  @override
  Future<Result<List<Post>>> getPosts() async => const Result.ok([]);
}

void main() {
  group('PostDetailPage', () {
    testWidgets('renders the post on success', (tester) async {
      final repo = _FakeRepo(
        const Result.ok(
          Post(id: 7, userId: 3, title: 'Detail title', body: 'Detail body'),
        ),
      );

      await tester.pumpApp(
        const PostDetailPage(postId: 7),
        overrides: [postRepositoryProvider.overrideWithValue(repo)],
      );
      await tester.pumpAndSettle();

      expect(find.text('Detail title'), findsOneWidget);
      expect(find.text('Detail body'), findsOneWidget);
      expect(find.text('AUTHOR #3'), findsOneWidget);
    });

    testWidgets('shows a localized error with retry on failure', (
      tester,
    ) async {
      final repo = _FakeRepo(const Result.err(NetworkFailure()));

      await tester.pumpApp(
        const PostDetailPage(postId: 7),
        overrides: [postRepositoryProvider.overrideWithValue(repo)],
      );
      await tester.pumpAndSettle();

      expect(
        find.text('No internet connection. Please try again.'),
        findsOneWidget,
      );
      expect(find.text('Retry'), findsOneWidget);
    });
  });
}
