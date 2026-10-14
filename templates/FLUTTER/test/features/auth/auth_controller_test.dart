import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:fwiflu/features/auth/presentation/auth_controller.dart';

void main() {
  late ProviderContainer container;

  setUp(() {
    container = ProviderContainer();
    addTearDown(container.dispose);
  });

  group('AuthController', () {
    test('starts logged out', () {
      expect(container.read(authControllerProvider), isFalse);
    });

    test('login sets the state to logged in', () {
      container.read(authControllerProvider.notifier).login();
      expect(container.read(authControllerProvider), isTrue);
    });

    test('logout clears the state', () {
      container.read(authControllerProvider.notifier)
        ..login()
        ..logout();
      expect(container.read(authControllerProvider), isFalse);
    });
  });
}
