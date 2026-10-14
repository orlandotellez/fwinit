import 'package:flutter/widgets.dart';
import 'package:fwiflu/l10n/gen/app_localizations.dart';

export 'package:fwiflu/l10n/gen/app_localizations.dart';

/// Convenience accessor for localized strings.
///
/// Instead of `AppLocalizations.of(context)!.postsTitle`, write
/// `context.l10n.postsTitle`.
extension AppLocalizationsX on BuildContext {
  AppLocalizations get l10n => AppLocalizations.of(this);
}
