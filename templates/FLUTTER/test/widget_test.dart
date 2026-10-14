// Smoke test: the app boots to the login screen and, after signing in,
// lands on the tabbed home shell.
//
// See the `test/` subfolders for focused unit and widget tests of each layer.
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:fwiflu/app/app.dart';

void main() {
  testWidgets('boots to login, then signs in to the home shell', (
    tester,
  ) async {
    await tester.pumpWidget(const ProviderScope(child: App()));
    await tester.pumpAndSettle();

    // Unauthenticated → login screen.
    expect(find.text('Sign in'), findsOneWidget);

    await tester.tap(find.text('Sign in'));
    await tester.pumpAndSettle();

    // Authenticated → tabbed shell with the home dashboard.
    expect(find.byType(NavigationBar), findsOneWidget);
    expect(find.text('Counter'), findsOneWidget);
  });
}
