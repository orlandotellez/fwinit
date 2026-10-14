import 'package:flutter_riverpod/flutter_riverpod.dart';

/// A minimal synchronous state controller.
///
/// Demonstrates the simplest Riverpod pattern — a [Notifier] holding a value
/// with intention-revealing methods. Because it has no dependencies, it is
/// trivial to unit test (see `test/features/counter/`).
class CounterController extends Notifier<int> {
  @override
  int build() => 0;

  void increment() => state++;
  void decrement() => state = state > 0 ? state - 1 : 0;
  void reset() => state = 0;
}

final counterProvider = NotifierProvider<CounterController, int>(
  CounterController.new,
);
