import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_en.dart';
import 'app_localizations_es.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'gen/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale)
    : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations)!;
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
        delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
      ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[
    Locale('en'),
    Locale('es'),
  ];

  /// The application title
  ///
  /// In en, this message translates to:
  /// **'fwiflu'**
  String get appTitle;

  /// No description provided for @appTagline.
  ///
  /// In en, this message translates to:
  /// **'Clean Architecture, Riverpod and one design system for light and dark.'**
  String get appTagline;

  /// No description provided for @homeTitle.
  ///
  /// In en, this message translates to:
  /// **'Home'**
  String get homeTitle;

  /// No description provided for @homeWelcome.
  ///
  /// In en, this message translates to:
  /// **'Start from a real design system.'**
  String get homeWelcome;

  /// No description provided for @homeSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Every colour, size and motion token is defined once, then spent everywhere.'**
  String get homeSubtitle;

  /// No description provided for @homeCounterSubtitle.
  ///
  /// In en, this message translates to:
  /// **'One screen, one synchronous Notifier.'**
  String get homeCounterSubtitle;

  /// No description provided for @homeComponentsSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Every shared widget, with its states.'**
  String get homeComponentsSubtitle;

  /// No description provided for @homeDesignSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Tokens, colour, type, spacing and motion.'**
  String get homeDesignSubtitle;

  /// No description provided for @homeExamplesSection.
  ///
  /// In en, this message translates to:
  /// **'Examples'**
  String get homeExamplesSection;

  /// No description provided for @counterTitle.
  ///
  /// In en, this message translates to:
  /// **'Counter'**
  String get counterTitle;

  /// No description provided for @counterReset.
  ///
  /// In en, this message translates to:
  /// **'Reset'**
  String get counterReset;

  /// No description provided for @counterIncrement.
  ///
  /// In en, this message translates to:
  /// **'Increment'**
  String get counterIncrement;

  /// No description provided for @counterDecrement.
  ///
  /// In en, this message translates to:
  /// **'Decrement'**
  String get counterDecrement;

  /// Counter value with pluralization
  ///
  /// In en, this message translates to:
  /// **'You have pushed the button {count, plural, =0{no times} =1{once} other{{count} times}}'**
  String counterValue(int count);

  /// No description provided for @postsTitle.
  ///
  /// In en, this message translates to:
  /// **'Posts'**
  String get postsTitle;

  /// No description provided for @postsSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Read from a remote API through the repository layer.'**
  String get postsSubtitle;

  /// No description provided for @postDetailTitle.
  ///
  /// In en, this message translates to:
  /// **'Post detail'**
  String get postDetailTitle;

  /// Author label on the post detail screen
  ///
  /// In en, this message translates to:
  /// **'Author #{userId}'**
  String postAuthor(int userId);

  /// No description provided for @retry.
  ///
  /// In en, this message translates to:
  /// **'Retry'**
  String get retry;

  /// No description provided for @cancel.
  ///
  /// In en, this message translates to:
  /// **'Cancel'**
  String get cancel;

  /// No description provided for @comingSoon.
  ///
  /// In en, this message translates to:
  /// **'Coming soon.'**
  String get comingSoon;

  /// No description provided for @emptyPosts.
  ///
  /// In en, this message translates to:
  /// **'No posts to show yet.'**
  String get emptyPosts;

  /// Shown when a route cannot be resolved
  ///
  /// In en, this message translates to:
  /// **'Page not found: {location}'**
  String routeNotFound(String location);

  /// No description provided for @tabHome.
  ///
  /// In en, this message translates to:
  /// **'Home'**
  String get tabHome;

  /// No description provided for @tabPosts.
  ///
  /// In en, this message translates to:
  /// **'Posts'**
  String get tabPosts;

  /// No description provided for @tabProfile.
  ///
  /// In en, this message translates to:
  /// **'Profile'**
  String get tabProfile;

  /// No description provided for @loginTitle.
  ///
  /// In en, this message translates to:
  /// **'Welcome back'**
  String get loginTitle;

  /// No description provided for @loginSubtitle.
  ///
  /// In en, this message translates to:
  /// **'There is no backend yet. Sign in to see the navigation flow.'**
  String get loginSubtitle;

  /// No description provided for @emailLabel.
  ///
  /// In en, this message translates to:
  /// **'Email'**
  String get emailLabel;

  /// No description provided for @emailInvalid.
  ///
  /// In en, this message translates to:
  /// **'Enter a valid email address.'**
  String get emailInvalid;

  /// No description provided for @passwordLabel.
  ///
  /// In en, this message translates to:
  /// **'Password'**
  String get passwordLabel;

  /// No description provided for @passwordTooShort.
  ///
  /// In en, this message translates to:
  /// **'Password is too short.'**
  String get passwordTooShort;

  /// No description provided for @showPassword.
  ///
  /// In en, this message translates to:
  /// **'Show password'**
  String get showPassword;

  /// No description provided for @hidePassword.
  ///
  /// In en, this message translates to:
  /// **'Hide password'**
  String get hidePassword;

  /// No description provided for @loginButton.
  ///
  /// In en, this message translates to:
  /// **'Sign in'**
  String get loginButton;

  /// No description provided for @logout.
  ///
  /// In en, this message translates to:
  /// **'Log out'**
  String get logout;

  /// No description provided for @logoutConfirmTitle.
  ///
  /// In en, this message translates to:
  /// **'Log out?'**
  String get logoutConfirmTitle;

  /// No description provided for @logoutConfirmMessage.
  ///
  /// In en, this message translates to:
  /// **'You will need to sign in again.'**
  String get logoutConfirmMessage;

  /// No description provided for @guestName.
  ///
  /// In en, this message translates to:
  /// **'Demo User'**
  String get guestName;

  /// No description provided for @guestEmail.
  ///
  /// In en, this message translates to:
  /// **'demo@example.com'**
  String get guestEmail;

  /// No description provided for @profileAccountSection.
  ///
  /// In en, this message translates to:
  /// **'Account'**
  String get profileAccountSection;

  /// No description provided for @profileAppearanceSection.
  ///
  /// In en, this message translates to:
  /// **'Appearance'**
  String get profileAppearanceSection;

  /// No description provided for @themeModeLabel.
  ///
  /// In en, this message translates to:
  /// **'Theme'**
  String get themeModeLabel;

  /// No description provided for @themeModeSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Follows your device by default.'**
  String get themeModeSubtitle;

  /// No description provided for @themeSystem.
  ///
  /// In en, this message translates to:
  /// **'System'**
  String get themeSystem;

  /// No description provided for @themeLight.
  ///
  /// In en, this message translates to:
  /// **'Light'**
  String get themeLight;

  /// No description provided for @themeDark.
  ///
  /// In en, this message translates to:
  /// **'Dark'**
  String get themeDark;

  /// No description provided for @profileNotifications.
  ///
  /// In en, this message translates to:
  /// **'Notifications'**
  String get profileNotifications;

  /// No description provided for @profileAbout.
  ///
  /// In en, this message translates to:
  /// **'About'**
  String get profileAbout;

  /// No description provided for @profileAboutBody.
  ///
  /// In en, this message translates to:
  /// **'Clean Architecture, Riverpod and one design system for light and dark.'**
  String get profileAboutBody;

  /// No description provided for @componentsTitle.
  ///
  /// In en, this message translates to:
  /// **'Components'**
  String get componentsTitle;

  /// No description provided for @componentsFoundation.
  ///
  /// In en, this message translates to:
  /// **'Foundation'**
  String get componentsFoundation;

  /// No description provided for @componentsColors.
  ///
  /// In en, this message translates to:
  /// **'Colour'**
  String get componentsColors;

  /// No description provided for @componentsTypographySection.
  ///
  /// In en, this message translates to:
  /// **'Typography'**
  String get componentsTypographySection;

  /// No description provided for @componentsSpacing.
  ///
  /// In en, this message translates to:
  /// **'Spacing and radii'**
  String get componentsSpacing;

  /// No description provided for @componentsMotion.
  ///
  /// In en, this message translates to:
  /// **'Motion'**
  String get componentsMotion;

  /// No description provided for @componentsStates.
  ///
  /// In en, this message translates to:
  /// **'States'**
  String get componentsStates;

  /// No description provided for @componentsButtons.
  ///
  /// In en, this message translates to:
  /// **'Buttons'**
  String get componentsButtons;

  /// No description provided for @componentsInputs.
  ///
  /// In en, this message translates to:
  /// **'Inputs'**
  String get componentsInputs;

  /// No description provided for @componentsFeedback.
  ///
  /// In en, this message translates to:
  /// **'Feedback'**
  String get componentsFeedback;

  /// No description provided for @componentsData.
  ///
  /// In en, this message translates to:
  /// **'Data display'**
  String get componentsData;

  /// No description provided for @componentsCardExample.
  ///
  /// In en, this message translates to:
  /// **'Cards group related content.'**
  String get componentsCardExample;

  /// No description provided for @errorNetwork.
  ///
  /// In en, this message translates to:
  /// **'No internet connection. Please try again.'**
  String get errorNetwork;

  /// No description provided for @errorServer.
  ///
  /// In en, this message translates to:
  /// **'Something went wrong on our end. Please try again later.'**
  String get errorServer;

  /// No description provided for @errorData.
  ///
  /// In en, this message translates to:
  /// **'We received unexpected data. Please try again.'**
  String get errorData;

  /// No description provided for @errorCache.
  ///
  /// In en, this message translates to:
  /// **'Could not read local data.'**
  String get errorCache;

  /// No description provided for @errorUnknown.
  ///
  /// In en, this message translates to:
  /// **'An unexpected error occurred.'**
  String get errorUnknown;
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['en', 'es'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'en':
      return AppLocalizationsEn();
    case 'es':
      return AppLocalizationsEs();
  }

  throw FlutterError(
    'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.',
  );
}
