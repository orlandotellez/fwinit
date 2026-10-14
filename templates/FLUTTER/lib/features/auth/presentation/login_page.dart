import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:fwiflu/core/theme/app_colors.dart';
import 'package:fwiflu/core/theme/app_spacing.dart';
import 'package:fwiflu/core/widgets/widgets.dart';
import 'package:fwiflu/features/auth/presentation/auth_controller.dart';
import 'package:fwiflu/l10n/l10n.dart';

/// Sign-in screen.
///
/// Intentionally has **no real auth logic** — submitting simply flips the
/// [authControllerProvider] flag, which the router observes and redirects into
/// the app shell. It doubles as a live example of the shared widget kit
/// (`AppTextField`, `AppButton`) and of the brand's editorial layout: one
/// headline, one supporting line, one hairline, one primary action.
class LoginPage extends ConsumerStatefulWidget {
  const LoginPage({super.key});

  @override
  ConsumerState<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends ConsumerState<LoginPage> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController(text: 'demo@example.com');
  final _passwordController = TextEditingController(text: 'password');
  bool _submitting = false;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _submitting = true);

    // Simulate a network round-trip so the loading state is visible.
    await Future<void>.delayed(const Duration(milliseconds: 600));
    if (!mounted) return;

    // No real auth: just mark the session as signed in. The router redirect
    // takes it from here.
    ref.read(authControllerProvider.notifier).login();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final palette = context.palette;
    final theme = Theme.of(context);

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(AppSpacing.lg),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: AppReveal(
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Row(
                        children: [
                          const AppIconBox(icon: Icons.layers_outlined),
                          const Gap.h(AppSpacing.sm),
                          Text(
                            l10n.appTitle,
                            style: theme.textTheme.titleLarge?.copyWith(
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ],
                      ),
                      const Gap(AppSpacing.xl),
                      Text(
                        l10n.loginTitle,
                        style: theme.textTheme.displaySmall,
                      ),
                      const Gap(AppSpacing.sm),
                      Text(
                        l10n.loginSubtitle,
                        style: theme.textTheme.bodyLarge?.copyWith(
                          color: palette.textMuted,
                        ),
                      ),
                      const Gap(AppSpacing.xl),
                      const Hairline(),
                      const Gap(AppSpacing.xl),
                      AppTextField(
                        label: l10n.emailLabel,
                        controller: _emailController,
                        prefixIcon: Icons.email_outlined,
                        keyboardType: TextInputType.emailAddress,
                        textInputAction: TextInputAction.next,
                        validator: (value) =>
                            (value == null || !value.contains('@'))
                            ? l10n.emailInvalid
                            : null,
                      ),
                      const Gap(AppSpacing.md),
                      AppTextField(
                        label: l10n.passwordLabel,
                        controller: _passwordController,
                        prefixIcon: Icons.lock_outline,
                        obscurable: true,
                        textInputAction: TextInputAction.done,
                        onSubmitted: (_) => _submit(),
                        validator: (value) =>
                            (value == null || value.length < 4)
                            ? l10n.passwordTooShort
                            : null,
                      ),
                      const Gap(AppSpacing.xl),
                      AppButton(
                        label: l10n.loginButton,
                        onPressed: _submit,
                        isLoading: _submitting,
                        expanded: true,
                      ),
                      const Gap(AppSpacing.md),
                      Text(
                        l10n.appTagline,
                        textAlign: TextAlign.center,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: palette.textFaint,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
