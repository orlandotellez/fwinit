import 'package:flutter_test/flutter_test.dart';
import 'package:fwiflu/core/error/exceptions.dart';
import 'package:fwiflu/core/error/failure.dart';
import 'package:fwiflu/features/posts/data/datasources/post_remote_data_source.dart';
import 'package:fwiflu/features/posts/data/models/post_dto.dart';
import 'package:fwiflu/features/posts/data/repositories/post_repository_impl.dart';
import 'package:mocktail/mocktail.dart';

class _MockRemote extends Mock implements PostRemoteDataSource {}

void main() {
  late _MockRemote remote;
  late PostRepositoryImpl repository;

  const dto = PostDto(id: 1, userId: 1, title: 'Hello', body: 'World');

  setUp(() {
    remote = _MockRemote();
    repository = PostRepositoryImpl(remote);
  });

  group('PostRepositoryImpl.getPosts', () {
    test('maps DTOs to entities on success', () async {
      when(() => remote.fetchPosts()).thenAnswer((_) async => [dto]);

      final result = await repository.getPosts();

      expect(result.isOk, isTrue);
      final posts = result.valueOrNull!;
      expect(posts, hasLength(1));
      expect(posts.first.title, 'Hello');
      verify(() => remote.fetchPosts()).called(1);
    });

    test('maps NetworkException to NetworkFailure', () async {
      when(
        () => remote.fetchPosts(),
      ).thenThrow(const NetworkException('offline'));

      final result = await repository.getPosts();

      expect(result.failureOrNull, isA<NetworkFailure>());
    });

    test('maps ServerException to ServerFailure with status code', () async {
      when(
        () => remote.fetchPosts(),
      ).thenThrow(const ServerException(statusCode: 503));

      final result = await repository.getPosts();

      final failure = result.failureOrNull;
      expect(failure, isA<ServerFailure>());
      expect((failure! as ServerFailure).statusCode, 503);
    });

    test('maps ParsingException to DataFailure', () async {
      when(() => remote.fetchPosts()).thenThrow(const ParsingException());

      final result = await repository.getPosts();

      expect(result.failureOrNull, isA<DataFailure>());
    });

    test('maps unexpected errors to UnknownFailure', () async {
      when(() => remote.fetchPosts()).thenThrow(StateError('boom'));

      final result = await repository.getPosts();

      expect(result.failureOrNull, isA<UnknownFailure>());
    });
  });

  group('PostRepositoryImpl.getPost', () {
    test('maps a DTO to an entity on success', () async {
      when(() => remote.fetchPost(1)).thenAnswer((_) async => dto);

      final result = await repository.getPost(1);

      expect(result.isOk, isTrue);
      expect(result.valueOrNull!.title, 'Hello');
      verify(() => remote.fetchPost(1)).called(1);
    });

    test('maps ServerException to ServerFailure', () async {
      when(
        () => remote.fetchPost(1),
      ).thenThrow(const ServerException(statusCode: 404));

      final result = await repository.getPost(1);

      expect(result.failureOrNull, isA<ServerFailure>());
    });
  });
}
