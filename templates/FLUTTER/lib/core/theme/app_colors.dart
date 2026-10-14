import 'package:flutter/material.dart';

/// The semantic colour tokens of the fwiflu design language.
///
/// "Minimal editorial dual": near-neutral surfaces, hairline borders instead of
/// shadows, and a single accent used surgically. The palette is hand-picked and
/// deliberately **not** derived from a seed colour, so both brightnesses stay
/// exactly on brand.
///
/// Every foreground/background pair in [light] and [dark] passes WCAG AA
/// (>= 4.5:1) against its own surface.
@immutable
class AppPalette extends ThemeExtension<AppPalette> {
  const AppPalette({
    required this.bgBase,
    required this.bgElevated,
    required this.bgInset,
    required this.bgMuted,
    required this.border,
    required this.borderStrong,
    required this.accent,
    required this.accentStrong,
    required this.accentSoft,
    required this.onAccent,
    required this.textPrimary,
    required this.textMuted,
    required this.textFaint,
    required this.success,
    required this.danger,
    required this.warning,
    required this.info,
    required this.overlayShadow,
  });

  /// Screen background.
  final Color bgBase;

  /// Cards and elevated surfaces.
  final Color bgElevated;

  /// Inputs and recessed rails.
  final Color bgInset;

  /// Chips, icon boxes and inactive tracks.
  final Color bgMuted;

  /// Default hairline border.
  final Color border;

  /// Hairline border on hover, focus and emphasis.
  final Color borderStrong;

  /// The single brand accent.
  final Color accent;

  /// Accent on hover/press.
  final Color accentStrong;

  /// Low-opacity accent tint for selection and indicators.
  final Color accentSoft;

  /// Foreground on top of [accent].
  final Color onAccent;

  /// Primary text.
  final Color textPrimary;

  /// Supporting body copy.
  final Color textMuted;

  /// Decorative labels and metadata only (never body copy or inputs).
  final Color textFaint;

  /// Positive feedback.
  final Color success;

  /// Negative feedback and destructive actions.
  final Color danger;

  /// Caution feedback.
  final Color warning;

  /// Informational feedback.
  final Color info;

  /// Overlay shadow colour, reserved for dialogs and sheets.
  final Color overlayShadow;

  /// Light palette.
  static const AppPalette light = AppPalette(
    bgBase: Color(0xFFFAFAF8),
    bgElevated: Color(0xFFFFFFFF),
    bgInset: Color(0xFFF2F2F0),
    bgMuted: Color(0xFFECECE9),
    border: Color(0x1416161A),
    borderStrong: Color(0x2916161A),
    accent: Color(0xFF4C5FD5),
    accentStrong: Color(0xFF3B4CC0),
    accentSoft: Color(0x144C5FD5),
    onAccent: Color(0xFFFFFFFF),
    textPrimary: Color(0xFF16161A),
    textMuted: Color(0xFF555555),
    textFaint: Color(0xFF6B6B6B),
    success: Color(0xFF1A7F4E),
    danger: Color(0xFFB42318),
    warning: Color(0xFFB45309),
    info: Color(0xFF1D4ED8),
    overlayShadow: Color(0x14000000),
  );

  /// Dark palette. The accent flips to a light indigo, so text on top of it
  /// must be near-black instead of white.
  static const AppPalette dark = AppPalette(
    bgBase: Color(0xFF121316),
    bgElevated: Color(0xFF17181C),
    bgInset: Color(0xFF0D0E11),
    bgMuted: Color(0xFF1E2025),
    border: Color(0x1FE9E9EC),
    borderStrong: Color(0x3DE9E9EC),
    accent: Color(0xFF8E9BFF),
    accentStrong: Color(0xFFA9B3FF),
    accentSoft: Color(0x248E9BFF),
    onAccent: Color(0xFF12131A),
    textPrimary: Color(0xFFE9E9EC),
    textMuted: Color(0xFFA8AAB3),
    textFaint: Color(0xFF8A8C96),
    success: Color(0xFF4ADE80),
    danger: Color(0xFFFF8A80),
    warning: Color(0xFFFBBF24),
    info: Color(0xFF93C5FD),
    overlayShadow: Color(0x80000000),
  );

  @override
  AppPalette copyWith({
    Color? bgBase,
    Color? bgElevated,
    Color? bgInset,
    Color? bgMuted,
    Color? border,
    Color? borderStrong,
    Color? accent,
    Color? accentStrong,
    Color? accentSoft,
    Color? onAccent,
    Color? textPrimary,
    Color? textMuted,
    Color? textFaint,
    Color? success,
    Color? danger,
    Color? warning,
    Color? info,
    Color? overlayShadow,
  }) {
    return AppPalette(
      bgBase: bgBase ?? this.bgBase,
      bgElevated: bgElevated ?? this.bgElevated,
      bgInset: bgInset ?? this.bgInset,
      bgMuted: bgMuted ?? this.bgMuted,
      border: border ?? this.border,
      borderStrong: borderStrong ?? this.borderStrong,
      accent: accent ?? this.accent,
      accentStrong: accentStrong ?? this.accentStrong,
      accentSoft: accentSoft ?? this.accentSoft,
      onAccent: onAccent ?? this.onAccent,
      textPrimary: textPrimary ?? this.textPrimary,
      textMuted: textMuted ?? this.textMuted,
      textFaint: textFaint ?? this.textFaint,
      success: success ?? this.success,
      danger: danger ?? this.danger,
      warning: warning ?? this.warning,
      info: info ?? this.info,
      overlayShadow: overlayShadow ?? this.overlayShadow,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is AppPalette &&
          other.bgBase == bgBase &&
          other.bgElevated == bgElevated &&
          other.bgInset == bgInset &&
          other.bgMuted == bgMuted &&
          other.border == border &&
          other.borderStrong == borderStrong &&
          other.accent == accent &&
          other.accentStrong == accentStrong &&
          other.accentSoft == accentSoft &&
          other.onAccent == onAccent &&
          other.textPrimary == textPrimary &&
          other.textMuted == textMuted &&
          other.textFaint == textFaint &&
          other.success == success &&
          other.danger == danger &&
          other.warning == warning &&
          other.info == info &&
          other.overlayShadow == overlayShadow;

  @override
  int get hashCode => Object.hash(
    bgBase,
    bgElevated,
    bgInset,
    bgMuted,
    border,
    borderStrong,
    accent,
    accentStrong,
    accentSoft,
    onAccent,
    textPrimary,
    textMuted,
    textFaint,
    success,
    danger,
    warning,
    info,
    overlayShadow,
  );

  @override
  AppPalette lerp(ThemeExtension<AppPalette>? other, double t) {
    if (other is! AppPalette) return this;
    return AppPalette(
      bgBase: Color.lerp(bgBase, other.bgBase, t)!,
      bgElevated: Color.lerp(bgElevated, other.bgElevated, t)!,
      bgInset: Color.lerp(bgInset, other.bgInset, t)!,
      bgMuted: Color.lerp(bgMuted, other.bgMuted, t)!,
      border: Color.lerp(border, other.border, t)!,
      borderStrong: Color.lerp(borderStrong, other.borderStrong, t)!,
      accent: Color.lerp(accent, other.accent, t)!,
      accentStrong: Color.lerp(accentStrong, other.accentStrong, t)!,
      accentSoft: Color.lerp(accentSoft, other.accentSoft, t)!,
      onAccent: Color.lerp(onAccent, other.onAccent, t)!,
      textPrimary: Color.lerp(textPrimary, other.textPrimary, t)!,
      textMuted: Color.lerp(textMuted, other.textMuted, t)!,
      textFaint: Color.lerp(textFaint, other.textFaint, t)!,
      success: Color.lerp(success, other.success, t)!,
      danger: Color.lerp(danger, other.danger, t)!,
      warning: Color.lerp(warning, other.warning, t)!,
      info: Color.lerp(info, other.info, t)!,
      overlayShadow: Color.lerp(overlayShadow, other.overlayShadow, t)!,
    );
  }
}

/// Reads the fwiflu palette from the ambient theme.
///
/// The widgets in `core/widgets` require the app theme: build them under
/// `AppTheme.light()` or `AppTheme.dark()`. A missing extension is a wiring
/// bug, so it asserts in debug with an actionable message and still degrades to
/// a sane palette instead of crashing the screen in release.
extension AppPaletteX on BuildContext {
  /// The semantic tokens for the current brightness.
  AppPalette get palette {
    final palette = Theme.of(this).extension<AppPalette>();
    assert(
      palette != null,
      'AppPalette is missing from the ambient ThemeData. Build this widget '
      'under AppTheme.light() or AppTheme.dark() (see lib/app/app.dart).',
    );
    return palette ??
        (Theme.of(this).brightness == Brightness.dark
            ? AppPalette.dark
            : AppPalette.light);
  }
}
