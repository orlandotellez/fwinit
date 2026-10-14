import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:fwiflu/core/theme/app_colors.dart';
import 'package:fwiflu/core/theme/app_spacing.dart';
import 'package:fwiflu/core/theme/app_typography.dart';
import 'package:fwiflu/core/widgets/async_value_view.dart';
import 'package:fwiflu/core/widgets/gap.dart';
import 'package:fwiflu/core/widgets/hairline.dart';
import 'package:fwiflu/core/widgets/reveal.dart';
import 'package:fwiflu/features/posts/presentation/providers/posts_providers.dart';
import 'package:fwiflu/l10n/l10n.dart';

/// Detail screen for a single post.
///
/// Demonstrates navigation with a path parameter (`/posts/:id`) and a
/// `FutureProvider.family` that loads data keyed by that parameter. One column,
/// one headline, one hairline.
class PostDetailPage extends ConsumerWidget {
  const PostDetailPage({required this.postId, super.key});

  final int postId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final palette = context.palette;
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(title: Text(l10n.postDetailTitle)),
      body: AsyncValueView(
        value: ref.watch(postDetailProvider(postId)),
        onRetry: () => ref.invalidate(postDetailProvider(postId)),
        data: (post) => SingleChildScrollView(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: AppReveal(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  l10n.postAuthor(post.userId).toUpperCase(),
                  style: AppTypography.sectionLabel(palette.textFaint),
                ),
                const Gap(AppSpacing.sm),
                Text(post.title, style: theme.textTheme.headlineSmall),
                const Gap(AppSpacing.lg),
                const Hairline(),
                const Gap(AppSpacing.lg),
                Text(post.body, style: theme.textTheme.bodyLarge),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
