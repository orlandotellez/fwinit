import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:fwiflu/features/counter/presentation/counter_controller.dart';

void main() {
  late ProviderContainer container;

  setUp(() {
    container = ProviderContainer();
    addTearDown(container.dispose);
  });

  CounterController controller() => container.read(counterProvider.notifier);
  int value() => container.read(counterProvider);

  group('CounterController', () {
    test('starts at zero', () {
      expect(value(), 0);
    });

    test('increment increases the value', () {
      controller().increment();
      controller().increment();
      expect(value(), 2);
    });

    test('decrement never goes below zero', () {
      controller().decrement();
      expect(value(), 0);

      controller().increment();
      controller().decrement();
      controller().decrement();
      expect(value(), 0);
    });

    test('reset returns to zero', () {
      controller()
        ..increment()
        ..increment();
      controller().reset();
      expect(value(), 0);
    });
  });
}
