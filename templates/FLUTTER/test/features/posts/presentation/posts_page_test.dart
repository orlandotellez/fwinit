import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:fwiflu/core/error/failure.dart';
import 'package:fwiflu/core/utils/result.dart';
import 'package:fwiflu/features/posts/domain/entities/post.dart';
import 'package:fwiflu/features/posts/domain/repositories/post_repository.dart';
import 'package:fwiflu/features/posts/presentation/pages/posts_page.dart';
import 'package:fwiflu/features/posts/presentation/providers/posts_providers.dart';

import '../../../support/pump_app.dart';

class _FakeRepo implements PostRepository {
  _FakeRepo(this._result);
  final Result<List<Post>> _result;

  @override
  Future<Result<List<Post>>> getPosts() async => _result;

  @override
  Future<Result<Post>> getPost(int id) async =>
      const Result.err(UnknownFailure());
}

void main() {
  group('PostsPage', () {
    testWidgets('renders posts on success', (tester) async {
      final repo = _FakeRepo(
        const Result.ok([
          Post(id: 1, userId: 1, title: 'First post', body: 'Body one'),
          Post(id: 2, userId: 1, title: 'Second post', body: 'Body two'),
        ]),
      );

      await tester.pumpApp(
        const PostsPage(),
        overrides: [postRepositoryProvider.overrideWithValue(repo)],
      );
      await tester.pumpAndSettle();

      // Sorted newest-first by the GetPosts use case.
      expect(find.text('Second post'), findsOneWidget);
      expect(find.text('First post'), findsOneWidget);
    });

    testWidgets('shows an error state with a retry button', (tester) async {
      final repo = _FakeRepo(const Result.err(NetworkFailure()));

      await tester.pumpApp(
        const PostsPage(),
        overrides: [postRepositoryProvider.overrideWithValue(repo)],
      );
      await tester.pumpAndSettle();

      expect(find.text('Retry'), findsOneWidget);
      expect(find.byIcon(Icons.error_outline), findsOneWidget);
    });
  });
}
