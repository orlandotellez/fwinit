import 'package:flutter/material.dart';
import 'package:fwiflu/core/theme/app_colors.dart';
import 'package:fwiflu/core/theme/app_spacing.dart';
import 'package:fwiflu/core/theme/app_typography.dart';

/// The fwiflu design language: **Minimal editorial dual**.
///
/// Rules this file encodes:
/// - Surfaces separate through surface contrast plus a 1px hairline border.
///   Elevation is 0 almost everywhere, so nothing floats by accident.
/// - A single accent, used surgically: primary action, links, focus ring and
///   one key word per headline. There is no second brand hue.
/// - Whitespace is the design. Nothing decorative is added to fill space.
/// - Section labels are quiet uppercase text (see [AppTypography.sectionLabel]).
/// - Hierarchy comes from an explicit type scale, not from a font family.
/// - The palette is hand-picked in [AppPalette] and deliberately **not**
///   derived from a seed colour, so light and dark stay exactly on brand.
/// - Motion is short and honours the platform "reduce motion" setting
///   (see `AppMotion`).
abstract final class AppTheme {
  /// Width of the accent focus ring.
  static const double _focusWidth = 2;

  /// The light theme.
  static ThemeData light() => _build(Brightness.light, AppPalette.light);

  /// The dark theme.
  static ThemeData dark() => _build(Brightness.dark, AppPalette.dark);

  static ThemeData _build(Brightness brightness, AppPalette palette) {
    final scheme = brightness == Brightness.light ? _lightScheme : _darkScheme;
    final textTheme = AppTypography.textTheme(scheme);
    final hairline = BorderSide(color: palette.border);

    return ThemeData(
      brightness: brightness,
      colorScheme: scheme,
      extensions: [palette],
      scaffoldBackgroundColor: palette.bgBase,
      canvasColor: palette.bgBase,
      dividerColor: palette.border,
      textTheme: textTheme,
      // No ink ripple: state changes are expressed by a hairline darkening and
      // an accent-soft overlay instead of a splash.
      splashFactory: NoSplash.splashFactory,
      visualDensity: VisualDensity.standard,
      // Touch targets stay at or above 44 logical pixels.
      materialTapTargetSize: MaterialTapTargetSize.padded,
      appBarTheme: AppBarTheme(
        backgroundColor: palette.bgBase,
        foregroundColor: palette.textPrimary,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        titleTextStyle: textTheme.titleLarge,
        shape: Border(bottom: hairline),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: palette.bgElevated,
        elevation: 0,
        height: 64,
        indicatorColor: palette.accentSoft,
        indicatorShape: const RoundedRectangleBorder(
          borderRadius: AppRadius.mdAll,
        ),
        labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
        iconTheme: WidgetStateProperty.resolveWith<IconThemeData?>(
          (states) => IconThemeData(
            size: 24,
            color: states.contains(WidgetState.selected)
                ? palette.accent
                : palette.textMuted,
          ),
        ),
        labelTextStyle: WidgetStateProperty.resolveWith<TextStyle?>(
          (states) => TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            letterSpacing: 0.2,
            height: 1.4,
            color: states.contains(WidgetState.selected)
                ? palette.accent
                : palette.textMuted,
          ),
        ),
      ),
      cardTheme: CardThemeData(
        color: palette.bgElevated,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: AppRadius.mdAll,
          side: hairline,
        ),
      ),
      dividerTheme: DividerThemeData(
        color: palette.border,
        thickness: AppStroke.hairline,
        space: AppStroke.hairline,
      ),
      filledButtonTheme: FilledButtonThemeData(
        style:
            FilledButton.styleFrom(
              foregroundColor: palette.onAccent,
              disabledBackgroundColor: palette.bgMuted,
              disabledForegroundColor: palette.textFaint,
              minimumSize: const Size(64, 48),
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
              textStyle: textTheme.labelLarge,
              shape: const RoundedRectangleBorder(
                borderRadius: AppRadius.mdAll,
              ),
            ).copyWith(
              backgroundColor: WidgetStateProperty.resolveWith<Color?>((
                states,
              ) {
                if (states.contains(WidgetState.pressed)) {
                  return palette.accentStrong;
                }
                if (states.contains(WidgetState.disabled)) {
                  return palette.bgMuted;
                }
                return palette.accent;
              }),
              side: _focusSide(palette),
              overlayColor: WidgetStateProperty.resolveWith<Color?>((states) {
                if (states.contains(WidgetState.pressed)) {
                  return palette.onAccent.withValues(alpha: 0.12);
                }
                return null;
              }),
            ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style:
            OutlinedButton.styleFrom(
              foregroundColor: palette.textPrimary,
              backgroundColor: Colors.transparent,
              minimumSize: const Size(64, 48),
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
              textStyle: textTheme.labelLarge,
              shape: const RoundedRectangleBorder(
                borderRadius: AppRadius.mdAll,
              ),
            ).copyWith(
              side: WidgetStateProperty.resolveWith<BorderSide?>((states) {
                if (states.contains(WidgetState.focused)) {
                  return BorderSide(color: palette.accent, width: _focusWidth);
                }
                if (states.contains(WidgetState.disabled)) return hairline;
                return BorderSide(color: palette.borderStrong);
              }),
              overlayColor: const WidgetStatePropertyAll<Color?>(
                Colors.transparent,
              ),
            ),
      ),
      textButtonTheme: TextButtonThemeData(
        style:
            TextButton.styleFrom(
              foregroundColor: palette.accent,
              minimumSize: const Size(48, 44),
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
              textStyle: textTheme.labelLarge,
              shape: const RoundedRectangleBorder(
                borderRadius: AppRadius.mdAll,
              ),
            ).copyWith(
              side: _focusSide(palette),
              overlayColor: WidgetStatePropertyAll<Color?>(palette.accentSoft),
            ),
      ),
      iconButtonTheme: IconButtonThemeData(
        style: ButtonStyle(
          foregroundColor: WidgetStateProperty.resolveWith<Color?>((states) {
            if (states.contains(WidgetState.disabled)) return palette.textFaint;
            if (states.contains(WidgetState.focused)) return palette.accent;
            return palette.textMuted;
          }),
          overlayColor: WidgetStatePropertyAll<Color?>(palette.accentSoft),
          minimumSize: const WidgetStatePropertyAll<Size>(Size(44, 44)),
          shape: const WidgetStatePropertyAll<OutlinedBorder>(
            RoundedRectangleBorder(borderRadius: AppRadius.smAll),
          ),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: palette.bgInset,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.md,
          vertical: AppSpacing.md,
        ),
        border: OutlineInputBorder(
          borderRadius: AppRadius.mdAll,
          borderSide: hairline,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: AppRadius.mdAll,
          borderSide: hairline,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: AppRadius.mdAll,
          borderSide: BorderSide(color: palette.accent, width: _focusWidth),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: AppRadius.mdAll,
          borderSide: BorderSide(color: palette.danger),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: AppRadius.mdAll,
          borderSide: BorderSide(color: palette.danger, width: _focusWidth),
        ),
        disabledBorder: OutlineInputBorder(
          borderRadius: AppRadius.mdAll,
          borderSide: hairline,
        ),
        hintStyle: TextStyle(fontSize: 16, color: palette.textFaint),
        floatingLabelStyle: AppTypography.sectionLabel(palette.textFaint),
        errorStyle: TextStyle(fontSize: 12, color: palette.danger),
        helperStyle: TextStyle(fontSize: 12, color: palette.textMuted),
      ),
      // Overlays are the only place a shadow is allowed.
      dialogTheme: DialogThemeData(
        backgroundColor: palette.bgElevated,
        elevation: 8,
        shadowColor: palette.overlayShadow,
        shape: RoundedRectangleBorder(
          borderRadius: AppRadius.lgAll,
          side: hairline,
        ),
        titleTextStyle: textTheme.titleLarge,
        contentTextStyle: textTheme.bodyMedium,
      ),
      bottomSheetTheme: BottomSheetThemeData(
        backgroundColor: palette.bgElevated,
        elevation: 0,
        modalElevation: 8,
        modalBackgroundColor: palette.bgElevated,
        shadowColor: palette.overlayShadow,
        showDragHandle: true,
        dragHandleColor: palette.borderStrong,
        shape: RoundedRectangleBorder(
          borderRadius: const BorderRadius.vertical(
            top: Radius.circular(AppRadius.lg),
          ),
          side: hairline,
        ),
      ),
      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        elevation: 0,
        backgroundColor: palette.bgElevated,
        contentTextStyle: TextStyle(fontSize: 14, color: palette.textPrimary),
        actionTextColor: palette.accent,
        insetPadding: const EdgeInsets.all(AppSpacing.md),
        shape: RoundedRectangleBorder(
          borderRadius: AppRadius.mdAll,
          side: hairline,
        ),
      ),
      chipTheme: ChipThemeData(
        backgroundColor: palette.bgMuted,
        side: hairline,
        shape: const RoundedRectangleBorder(borderRadius: AppRadius.smAll),
        labelStyle: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: palette.textPrimary,
        ),
        secondaryLabelStyle: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: palette.textMuted,
        ),
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.sm,
          vertical: AppSpacing.xs,
        ),
        showCheckmark: false,
      ),
      segmentedButtonTheme: SegmentedButtonThemeData(
        style: ButtonStyle(
          minimumSize: const WidgetStatePropertyAll<Size>(Size(0, 40)),
          padding: const WidgetStatePropertyAll<EdgeInsetsGeometry>(
            EdgeInsets.symmetric(horizontal: AppSpacing.sm),
          ),
          textStyle: WidgetStatePropertyAll<TextStyle?>(textTheme.labelLarge),
          shape: const WidgetStatePropertyAll<OutlinedBorder>(
            RoundedRectangleBorder(borderRadius: AppRadius.mdAll),
          ),
          backgroundColor: WidgetStateProperty.resolveWith<Color?>(
            (states) => states.contains(WidgetState.selected)
                ? palette.accentSoft
                : Colors.transparent,
          ),
          foregroundColor: WidgetStateProperty.resolveWith<Color?>(
            (states) => states.contains(WidgetState.selected)
                ? palette.accent
                : palette.textMuted,
          ),
          side: WidgetStateProperty.resolveWith<BorderSide?>((states) {
            if (states.contains(WidgetState.focused)) {
              return BorderSide(color: palette.accent, width: _focusWidth);
            }
            return states.contains(WidgetState.selected)
                ? BorderSide(color: palette.accent)
                : BorderSide(color: palette.borderStrong);
          }),
        ),
      ),
      listTileTheme: ListTileThemeData(
        contentPadding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
        minVerticalPadding: AppSpacing.sm,
        iconColor: palette.textMuted,
        textColor: palette.textPrimary,
        shape: const RoundedRectangleBorder(borderRadius: AppRadius.mdAll),
      ),
      progressIndicatorTheme: ProgressIndicatorThemeData(
        color: palette.accent,
        linearTrackColor: palette.bgMuted,
        circularTrackColor: Colors.transparent,
      ),
      textSelectionTheme: TextSelectionThemeData(
        cursorColor: palette.accent,
        selectionColor: palette.accentSoft,
        selectionHandleColor: palette.accent,
      ),
      tooltipTheme: TooltipThemeData(
        decoration: BoxDecoration(
          color: palette.textPrimary,
          borderRadius: AppRadius.smAll,
        ),
        textStyle: TextStyle(fontSize: 12, color: palette.bgBase),
        waitDuration: const Duration(milliseconds: 400),
      ),
      sliderTheme: SliderThemeData(
        activeTrackColor: palette.accent,
        inactiveTrackColor: palette.bgMuted,
        thumbColor: palette.accent,
        overlayColor: palette.accentSoft,
        trackHeight: 2,
      ),
      switchTheme: SwitchThemeData(
        thumbColor: WidgetStateProperty.resolveWith<Color?>(
          (states) => states.contains(WidgetState.selected)
              ? palette.accent
              : palette.textFaint,
        ),
        trackColor: WidgetStateProperty.resolveWith<Color?>(
          (states) => states.contains(WidgetState.selected)
              ? palette.accentSoft
              : palette.bgMuted,
        ),
        trackOutlineColor: const WidgetStatePropertyAll<Color?>(null),
        trackOutlineWidth: const WidgetStatePropertyAll<double?>(
          AppStroke.hairline,
        ),
      ),
      checkboxTheme: CheckboxThemeData(
        fillColor: WidgetStateProperty.resolveWith<Color?>(
          (states) => states.contains(WidgetState.selected)
              ? palette.accent
              : Colors.transparent,
        ),
        checkColor: WidgetStatePropertyAll<Color?>(palette.onAccent),
        side: BorderSide(color: palette.borderStrong),
        shape: const RoundedRectangleBorder(borderRadius: AppRadius.smAll),
      ),
      radioTheme: RadioThemeData(
        fillColor: WidgetStateProperty.resolveWith<Color?>(
          (states) => states.contains(WidgetState.selected)
              ? palette.accent
              : palette.borderStrong,
        ),
      ),
    );
  }

  /// A 2px accent ring whenever the control holds focus.
  ///
  /// Hairline borders are not a focus indicator, so every interactive element
  /// gets an unmistakable accent outline on focus.
  static WidgetStateProperty<BorderSide?> _focusSide(
    AppPalette palette, {
    BorderSide? rest,
  }) => WidgetStateProperty.resolveWith<BorderSide?>(
    (states) => states.contains(WidgetState.focused)
        ? BorderSide(color: palette.accent, width: _focusWidth)
        : rest,
  );

  static const ColorScheme _lightScheme = ColorScheme.light(
    primary: Color(0xFF4C5FD5),
    primaryContainer: Color(0xFFE9ECFF),
    onPrimaryContainer: Color(0xFF131A4D),
    secondary: Color(0xFF55555A),
    onSecondary: Color(0xFFFFFFFF),
    secondaryContainer: Color(0xFFECECE9),
    onSecondaryContainer: Color(0xFF16161A),
    tertiary: Color(0xFF55555A),
    onTertiary: Color(0xFFFFFFFF),
    error: Color(0xFFB42318),
    errorContainer: Color(0xFFFDE7E4),
    onErrorContainer: Color(0xFF5C1109),
    surface: Color(0xFFFAFAF8),
    onSurface: Color(0xFF16161A),
    onSurfaceVariant: Color(0xFF555555),
    surfaceDim: Color(0xFFF0F0EE),
    surfaceBright: Color(0xFFFFFFFF),
    surfaceContainerLowest: Color(0xFFFFFFFF),
    surfaceContainerLow: Color(0xFFF7F7F5),
    surfaceContainer: Color(0xFFF2F2F0),
    surfaceContainerHigh: Color(0xFFECECE9),
    surfaceContainerHighest: Color(0xFFE6E6E2),
    outline: Color(0x2916161A),
    outlineVariant: Color(0x1416161A),
    inverseSurface: Color(0xFF16161A),
    onInverseSurface: Color(0xFFFAFAF8),
    inversePrimary: Color(0xFF8E9BFF),
    shadow: Color(0xFF000000),
    scrim: Color(0xFF000000),
  );

  static const ColorScheme _darkScheme = ColorScheme.dark(
    primary: Color(0xFF8E9BFF),
    onPrimary: Color(0xFF12131A),
    primaryContainer: Color(0xFF2A3170),
    onPrimaryContainer: Color(0xFFDDE2FF),
    secondary: Color(0xFFA8AAB3),
    onSecondary: Color(0xFF121316),
    secondaryContainer: Color(0xFF1E2025),
    onSecondaryContainer: Color(0xFFE9E9EC),
    tertiary: Color(0xFFA8AAB3),
    onTertiary: Color(0xFF121316),
    error: Color(0xFFFF8A80),
    onError: Color(0xFF3A0A05),
    errorContainer: Color(0xFF4A1712),
    onErrorContainer: Color(0xFFFFDAD5),
    surface: Color(0xFF121316),
    onSurface: Color(0xFFE9E9EC),
    onSurfaceVariant: Color(0xFFA8AAB3),
    surfaceDim: Color(0xFF0D0E11),
    surfaceBright: Color(0xFF2A2C31),
    surfaceContainerLowest: Color(0xFF0D0E11),
    surfaceContainerLow: Color(0xFF15161A),
    surfaceContainer: Color(0xFF17181C),
    surfaceContainerHigh: Color(0xFF1E2025),
    surfaceContainerHighest: Color(0xFF24262C),
    outline: Color(0x3DE9E9EC),
    outlineVariant: Color(0x1FE9E9EC),
    inverseSurface: Color(0xFFE9E9EC),
    onInverseSurface: Color(0xFF121316),
    inversePrimary: Color(0xFF4C5FD5),
    shadow: Color(0xFF000000),
    scrim: Color(0xFF000000),
  );
}
