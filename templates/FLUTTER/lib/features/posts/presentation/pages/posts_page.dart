import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:fwiflu/app/router/app_routes.dart';
import 'package:fwiflu/core/theme/app_colors.dart';
import 'package:fwiflu/core/theme/app_spacing.dart';
import 'package:fwiflu/core/widgets/async_value_view.dart';
import 'package:fwiflu/core/widgets/empty_view.dart';
import 'package:fwiflu/core/widgets/gap.dart';
import 'package:fwiflu/features/posts/presentation/providers/posts_providers.dart';
import 'package:fwiflu/features/posts/presentation/widgets/post_tile.dart';
import 'package:fwiflu/l10n/l10n.dart';
import 'package:go_router/go_router.dart';

/// Screen that lists posts fetched from the network.
///
/// Demonstrates the full data flow: data source → repository → use case →
/// controller → UI, with loading, error and pull-to-refresh handled through
/// the shared [AsyncValueView].
class PostsPage extends ConsumerWidget {
  const PostsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final palette = context.palette;

    return Scaffold(
      appBar: AppBar(title: Text(l10n.postsTitle)),
      body: AsyncValueView(
        value: ref.watch(postsControllerProvider),
        onRetry: () => ref.read(postsControllerProvider.notifier).refresh(),
        data: (posts) {
          if (posts.isEmpty) {
            return EmptyView(
              message: l10n.emptyPosts,
              icon: Icons.article_outlined,
            );
          }
          return RefreshIndicator(
            color: palette.accent,
            backgroundColor: palette.bgElevated,
            onRefresh: () =>
                ref.read(postsControllerProvider.notifier).refresh(),
            child: ListView.separated(
              padding: const EdgeInsets.all(AppSpacing.md),
              itemCount: posts.length,
              separatorBuilder: (context, index) => const Gap(AppSpacing.sm),
              itemBuilder: (context, index) {
                final post = posts[index];
                return PostTile(
                  post: post,
                  onTap: () => context.pushNamed(
                    AppRoute.postDetail.name,
                    pathParameters: {'id': '${post.id}'},
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }
}
