import 'package:flutter_test/flutter_test.dart';
import 'package:fwiflu/core/error/failure.dart';
import 'package:fwiflu/core/utils/result.dart';

void main() {
  group('Result', () {
    test('Ok exposes its value and reports isOk', () {
      const result = Result<int>.ok(42);

      expect(result.isOk, isTrue);
      expect(result.isErr, isFalse);
      expect(result.valueOrNull, 42);
      expect(result.failureOrNull, isNull);
    });

    test('Err exposes its failure and reports isErr', () {
      const failure = NetworkFailure();
      const result = Result<int>.err(failure);

      expect(result.isErr, isTrue);
      expect(result.valueOrNull, isNull);
      expect(result.failureOrNull, failure);
    });

    test('when() dispatches to the correct branch', () {
      const ok = Result<int>.ok(1);
      const err = Result<int>.err(UnknownFailure());

      expect(ok.when(ok: (v) => 'ok $v', err: (_) => 'err'), 'ok 1');
      expect(err.when(ok: (v) => 'ok $v', err: (_) => 'err'), 'err');
    });

    test('map() transforms Ok and preserves Err', () {
      const ok = Result<int>.ok(2);
      const err = Result<int>.err(CacheFailure());

      expect(ok.map((v) => v * 10).valueOrNull, 20);
      expect(err.map((v) => v * 10).failureOrNull, isA<CacheFailure>());
    });

    test('equality is value-based', () {
      expect(const Result<int>.ok(1), const Result<int>.ok(1));
      expect(const Result<int>.ok(1), isNot(const Result<int>.ok(2)));
    });
  });
}
