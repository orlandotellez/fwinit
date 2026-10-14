import 'package:flutter/material.dart';
import 'package:fwiflu/core/theme/app_colors.dart';
import 'package:fwiflu/core/theme/app_spacing.dart';
import 'package:fwiflu/core/theme/app_typography.dart';
import 'package:fwiflu/core/widgets/app_card.dart';
import 'package:fwiflu/core/widgets/gap.dart';
import 'package:fwiflu/features/posts/domain/entities/post.dart';
import 'package:fwiflu/l10n/l10n.dart';

/// A single post rendered as a quiet card.
///
/// The author line is the design language's quiet uppercase label, so the card
/// reads as metadata → headline → excerpt without any decorative chrome.
class PostTile extends StatelessWidget {
  const PostTile({required this.post, this.onTap, super.key});

  final Post post;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final palette = context.palette;
    final theme = Theme.of(context);

    return AppCard(
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            context.l10n.postAuthor(post.userId).toUpperCase(),
            style: AppTypography.sectionLabel(palette.textFaint),
          ),
          const Gap(AppSpacing.xs),
          Text(
            post.title,
            style: theme.textTheme.titleMedium,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
          const Gap(AppSpacing.sm),
          Text(
            post.body,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: palette.textMuted,
            ),
            maxLines: 3,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}
