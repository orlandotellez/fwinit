import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:fwiflu/core/theme/app_theme.dart';
import 'package:fwiflu/features/auth/presentation/auth_controller.dart';
import 'package:fwiflu/features/auth/presentation/login_page.dart';
import 'package:fwiflu/l10n/l10n.dart';

void main() {
  testWidgets('signing in flips the auth state to logged in', (tester) async {
    final container = ProviderContainer();
    addTearDown(container.dispose);

    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: MaterialApp(
          theme: AppTheme.light(),
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          home: const LoginPage(),
        ),
      ),
    );

    expect(container.read(authControllerProvider), isFalse);
    expect(find.text('Sign in'), findsOneWidget);

    await tester.tap(find.text('Sign in'));
    await tester.pump(); // enter the loading state
    // Advance past the simulated 600ms round-trip. We can't pumpAndSettle here
    // because, in isolation, the loading spinner animates forever (in the real
    // app the router redirect disposes this page on success).
    await tester.pump(const Duration(milliseconds: 700));

    expect(container.read(authControllerProvider), isTrue);
  });
}
