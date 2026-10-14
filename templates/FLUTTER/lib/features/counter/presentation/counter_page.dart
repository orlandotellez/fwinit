import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:fwiflu/core/theme/app_colors.dart';
import 'package:fwiflu/core/theme/app_spacing.dart';
import 'package:fwiflu/core/widgets/gap.dart';
import 'package:fwiflu/features/counter/presentation/counter_controller.dart';
import 'package:fwiflu/l10n/l10n.dart';

/// Example screen driven by a synchronous [CounterController].
///
/// The number is set in display type and takes the accent — the one place on
/// this screen where colour is allowed, because it is the content.
class CounterPage extends ConsumerWidget {
  const CounterPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final palette = context.palette;
    final theme = Theme.of(context);
    final count = ref.watch(counterProvider);
    final controller = ref.read(counterProvider.notifier);

    return Scaffold(
      appBar: AppBar(title: Text(l10n.counterTitle)),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.lg),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                '$count',
                style: theme.textTheme.displayLarge?.copyWith(
                  color: palette.accent,
                ),
              ),
              const Gap(AppSpacing.sm),
              Text(
                l10n.counterValue(count),
                textAlign: TextAlign.center,
                style: theme.textTheme.bodyLarge?.copyWith(
                  color: palette.textMuted,
                ),
              ),
              const Gap(AppSpacing.xl),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  IconButton.outlined(
                    onPressed: controller.decrement,
                    tooltip: l10n.counterDecrement,
                    icon: const Icon(Icons.remove),
                  ),
                  const Gap.h(AppSpacing.md),
                  IconButton.outlined(
                    onPressed: controller.reset,
                    tooltip: l10n.counterReset,
                    icon: const Icon(Icons.refresh),
                  ),
                  const Gap.h(AppSpacing.md),
                  IconButton.filled(
                    onPressed: controller.increment,
                    tooltip: l10n.counterIncrement,
                    icon: const Icon(Icons.add),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
