import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:fwiflu/app/router/app_routes.dart';
import 'package:fwiflu/core/theme/app_colors.dart';
import 'package:fwiflu/core/theme/app_spacing.dart';
import 'package:fwiflu/core/widgets/app_icon_box.dart';
import 'package:fwiflu/core/widgets/gap.dart';
import 'package:fwiflu/features/auth/presentation/auth_controller.dart';
import 'package:fwiflu/features/auth/presentation/login_page.dart';
import 'package:fwiflu/features/counter/presentation/counter_page.dart';
import 'package:fwiflu/features/home/presentation/home_page.dart';
import 'package:fwiflu/features/posts/presentation/pages/post_detail_page.dart';
import 'package:fwiflu/features/posts/presentation/pages/posts_page.dart';
import 'package:fwiflu/features/profile/presentation/profile_page.dart';
import 'package:fwiflu/features/shell/presentation/scaffold_with_nav_bar.dart';
import 'package:fwiflu/features/showcase/presentation/components_gallery_page.dart';
import 'package:fwiflu/l10n/l10n.dart';
import 'package:go_router/go_router.dart';

/// The app's [GoRouter], exposed as a provider so routing can depend on the
/// auth state (for redirects/guards) and be overridden in tests.
final routerProvider = Provider<GoRouter>((ref) {
  // Rebuild the redirect logic whenever auth state changes.
  final refresh = _AuthRefreshNotifier(ref);
  ref.onDispose(refresh.dispose);

  return GoRouter(
    initialLocation: AppRoute.home.path,
    debugLogDiagnostics: kDebugMode,
    refreshListenable: refresh,
    redirect: (context, state) {
      final loggedIn = ref.read(authControllerProvider);
      final onLoginPage = state.matchedLocation == AppRoute.login.path;

      if (!loggedIn) return onLoginPage ? null : AppRoute.login.path;
      if (onLoginPage) return AppRoute.home.path;
      return null;
    },
    routes: [
      GoRoute(
        path: AppRoute.login.path,
        name: AppRoute.login.name,
        builder: (context, state) => const LoginPage(),
      ),
      // The tabbed app shell. Each branch keeps its own navigation stack.
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) =>
            ScaffoldWithNavBar(navigationShell: navigationShell),
        branches: [
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: AppRoute.home.path,
                name: AppRoute.home.name,
                builder: (context, state) => const HomePage(),
                routes: [
                  GoRoute(
                    path: 'counter',
                    name: AppRoute.counter.name,
                    builder: (context, state) => const CounterPage(),
                  ),
                  GoRoute(
                    path: 'components',
                    name: AppRoute.components.name,
                    builder: (context, state) => const ComponentsGalleryPage(),
                  ),
                ],
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: AppRoute.posts.path,
                name: AppRoute.posts.name,
                builder: (context, state) => const PostsPage(),
                routes: [
                  GoRoute(
                    path: ':id',
                    name: AppRoute.postDetail.name,
                    builder: (context, state) {
                      final id = int.parse(state.pathParameters['id']!);
                      return PostDetailPage(postId: id);
                    },
                  ),
                ],
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: AppRoute.profile.path,
                name: AppRoute.profile.name,
                builder: (context, state) => const ProfilePage(),
              ),
            ],
          ),
        ],
      ),
    ],
    errorBuilder: (context, state) => Scaffold(
      appBar: AppBar(),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.lg),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              AppIconBox(
                icon: Icons.explore_off_outlined,
                color: context.palette.textMuted,
              ),
              const Gap(AppSpacing.md),
              Text(
                context.l10n.routeNotFound(state.uri.toString()),
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodyLarge,
              ),
            ],
          ),
        ),
      ),
    ),
  );
});

/// Bridges the Riverpod auth state to a [Listenable] that go_router can watch,
/// so navigation redirects re-run when the user logs in or out.
class _AuthRefreshNotifier extends ChangeNotifier {
  _AuthRefreshNotifier(Ref ref) {
    ref.listen(authControllerProvider, (_, _) => notifyListeners());
  }
}
