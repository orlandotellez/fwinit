import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:fwiflu/core/error/exceptions.dart';
import 'package:fwiflu/features/posts/data/datasources/post_remote_data_source.dart';

/// A minimal fake [HttpClientAdapter] so we can exercise the data source
/// against canned responses without hitting the network or adding a
/// dependency on a mock-adapter package.
class _FakeAdapter implements HttpClientAdapter {
  _FakeAdapter(this.responder);

  final ResponseBody Function(RequestOptions options) responder;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async => responder(options);

  @override
  void close({bool force = false}) {}
}

Dio _dioReturning(ResponseBody Function(RequestOptions) responder) {
  return Dio(BaseOptions(baseUrl: 'https://example.com'))
    ..httpClientAdapter = _FakeAdapter(responder);
}

ResponseBody _json(Object data, {int status = 200}) => ResponseBody.fromString(
  jsonEncode(data),
  status,
  headers: {
    Headers.contentTypeHeader: [Headers.jsonContentType],
  },
);

void main() {
  group('PostRemoteDataSourceImpl.fetchPosts', () {
    test('parses a list of posts', () async {
      final dio = _dioReturning(
        (_) => _json([
          {'id': 1, 'userId': 1, 'title': 'a', 'body': 'b'},
          {'id': 2, 'userId': 1, 'title': 'c', 'body': 'd'},
        ]),
      );
      final dataSource = PostRemoteDataSourceImpl(dio);

      final posts = await dataSource.fetchPosts();

      expect(posts, hasLength(2));
      expect(posts.first.title, 'a');
    });

    test('throws ServerException on non-2xx status', () async {
      final dio = _dioReturning((_) => _json(const {}, status: 500));
      final dataSource = PostRemoteDataSourceImpl(dio);

      expect(dataSource.fetchPosts, throwsA(isA<ServerException>()));
    });

    test('throws ParsingException on malformed payload', () async {
      final dio = _dioReturning(
        (_) => _json([
          {'unexpected': 'shape'},
        ]),
      );
      final dataSource = PostRemoteDataSourceImpl(dio);

      expect(dataSource.fetchPosts, throwsA(isA<ParsingException>()));
    });
  });
}
