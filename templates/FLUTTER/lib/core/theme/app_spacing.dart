import 'package:flutter/widgets.dart';

/// Design tokens for spacing. Use these instead of magic numbers so padding
/// and gaps stay consistent across the app.
///
/// The scale is the design system's rhythm: 4 · 8 · 16 · 24 · 32 · 48.
abstract final class AppSpacing {
  static const double xs = 4;
  static const double sm = 8;
  static const double md = 16;
  static const double lg = 24;
  static const double xl = 32;
  static const double xxl = 48;

  /// Common page padding.
  static const EdgeInsets page = EdgeInsets.all(md);
}

/// Design tokens for corner radii.
///
/// Small chips use [sm], the default surface radius (buttons, inputs, cards) is
/// [md], and overlays such as dialogs and sheets use [lg].
abstract final class AppRadius {
  static const double sm = 8;
  static const double md = 12;
  static const double lg = 16;
  static const double pill = 999;

  static const BorderRadius smAll = BorderRadius.all(Radius.circular(sm));
  static const BorderRadius mdAll = BorderRadius.all(Radius.circular(md));
  static const BorderRadius lgAll = BorderRadius.all(Radius.circular(lg));
  static const BorderRadius pillAll = BorderRadius.all(Radius.circular(pill));
}

/// Design tokens for stroke widths.
///
/// The design language separates surfaces with hairlines, not shadows.
abstract final class AppStroke {
  /// The single hairline width used for every border and divider.
  static const double hairline = 1;
}

/// The only shadows the design language allows.
///
/// Elevation is expressed as surface contrast plus a hairline border. Shadows
/// are reserved for overlays that genuinely float above the page: dialogs and
/// bottom sheets.
abstract final class AppElevation {
  /// Overlay shadow for the light theme: `0 8px 30px rgba(0, 0, 0, 0.08)`.
  static const BoxShadow overlayLight = BoxShadow(
    color: Color(0x14000000),
    blurRadius: 30,
    offset: Offset(0, 8),
  );

  /// Overlay shadow for the dark theme: `0 8px 30px rgba(0, 0, 0, 0.5)`.
  static const BoxShadow overlayDark = BoxShadow(
    color: Color(0x80000000),
    blurRadius: 30,
    offset: Offset(0, 8),
  );
}
