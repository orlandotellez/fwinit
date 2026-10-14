import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:fwiflu/core/storage/secure_store.dart';
import 'package:mocktail/mocktail.dart';

class _MockSecureStorage extends Mock implements FlutterSecureStorage {}

void main() {
  late _MockSecureStorage storage;
  late FlutterSecureStore store;

  setUp(() {
    storage = _MockSecureStorage();
    store = FlutterSecureStore(storage);
  });

  group('FlutterSecureStore', () {
    test('read delegates to the underlying storage', () async {
      when(() => storage.read(key: 'token')).thenAnswer((_) async => 'abc');

      expect(await store.read('token'), 'abc');
      verify(() => storage.read(key: 'token')).called(1);
    });

    test('write delegates to the underlying storage', () async {
      when(
        () => storage.write(key: 'token', value: 'abc'),
      ).thenAnswer((_) async {});

      await store.write('token', 'abc');

      verify(() => storage.write(key: 'token', value: 'abc')).called(1);
    });

    test('delete delegates to the underlying storage', () async {
      when(() => storage.delete(key: 'token')).thenAnswer((_) async {});

      await store.delete('token');

      verify(() => storage.delete(key: 'token')).called(1);
    });
  });
}
