import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Holds the (very simplified) authentication state: whether a user is signed
/// in. The router watches this to guard routes and redirect.
///
/// This template ships **no real authentication** — [login] just flips the
/// flag so you can see the navigation flow. Replace the body with real calls
/// (and persist a token via `SecureStore`) when you wire up a backend.
class AuthController extends Notifier<bool> {
  @override
  bool build() => false;

  /// Marks the user as signed in.
  void login() => state = true;

  /// Signs the user out.
  void logout() => state = false;
}

/// `true` when a user is signed in.
final authControllerProvider = NotifierProvider<AuthController, bool>(
  AuthController.new,
);
