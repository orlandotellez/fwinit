// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get appTitle => 'fwiflu';

  @override
  String get appTagline =>
      'Clean Architecture, Riverpod and one design system for light and dark.';

  @override
  String get homeTitle => 'Home';

  @override
  String get homeWelcome => 'Start from a real design system.';

  @override
  String get homeSubtitle =>
      'Every colour, size and motion token is defined once, then spent everywhere.';

  @override
  String get homeCounterSubtitle => 'One screen, one synchronous Notifier.';

  @override
  String get homeComponentsSubtitle => 'Every shared widget, with its states.';

  @override
  String get homeDesignSubtitle => 'Tokens, colour, type, spacing and motion.';

  @override
  String get homeExamplesSection => 'Examples';

  @override
  String get counterTitle => 'Counter';

  @override
  String get counterReset => 'Reset';

  @override
  String get counterIncrement => 'Increment';

  @override
  String get counterDecrement => 'Decrement';

  @override
  String counterValue(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count times',
      one: 'once',
      zero: 'no times',
    );
    return 'You have pushed the button $_temp0';
  }

  @override
  String get postsTitle => 'Posts';

  @override
  String get postsSubtitle =>
      'Read from a remote API through the repository layer.';

  @override
  String get postDetailTitle => 'Post detail';

  @override
  String postAuthor(int userId) {
    return 'Author #$userId';
  }

  @override
  String get retry => 'Retry';

  @override
  String get cancel => 'Cancel';

  @override
  String get comingSoon => 'Coming soon.';

  @override
  String get emptyPosts => 'No posts to show yet.';

  @override
  String routeNotFound(String location) {
    return 'Page not found: $location';
  }

  @override
  String get tabHome => 'Home';

  @override
  String get tabPosts => 'Posts';

  @override
  String get tabProfile => 'Profile';

  @override
  String get loginTitle => 'Welcome back';

  @override
  String get loginSubtitle =>
      'There is no backend yet. Sign in to see the navigation flow.';

  @override
  String get emailLabel => 'Email';

  @override
  String get emailInvalid => 'Enter a valid email address.';

  @override
  String get passwordLabel => 'Password';

  @override
  String get passwordTooShort => 'Password is too short.';

  @override
  String get showPassword => 'Show password';

  @override
  String get hidePassword => 'Hide password';

  @override
  String get loginButton => 'Sign in';

  @override
  String get logout => 'Log out';

  @override
  String get logoutConfirmTitle => 'Log out?';

  @override
  String get logoutConfirmMessage => 'You will need to sign in again.';

  @override
  String get guestName => 'Demo User';

  @override
  String get guestEmail => 'demo@example.com';

  @override
  String get profileAccountSection => 'Account';

  @override
  String get profileAppearanceSection => 'Appearance';

  @override
  String get themeModeLabel => 'Theme';

  @override
  String get themeModeSubtitle => 'Follows your device by default.';

  @override
  String get themeSystem => 'System';

  @override
  String get themeLight => 'Light';

  @override
  String get themeDark => 'Dark';

  @override
  String get profileNotifications => 'Notifications';

  @override
  String get profileAbout => 'About';

  @override
  String get profileAboutBody =>
      'Clean Architecture, Riverpod and one design system for light and dark.';

  @override
  String get componentsTitle => 'Components';

  @override
  String get componentsFoundation => 'Foundation';

  @override
  String get componentsColors => 'Colour';

  @override
  String get componentsTypographySection => 'Typography';

  @override
  String get componentsSpacing => 'Spacing and radii';

  @override
  String get componentsMotion => 'Motion';

  @override
  String get componentsStates => 'States';

  @override
  String get componentsButtons => 'Buttons';

  @override
  String get componentsInputs => 'Inputs';

  @override
  String get componentsFeedback => 'Feedback';

  @override
  String get componentsData => 'Data display';

  @override
  String get componentsCardExample => 'Cards group related content.';

  @override
  String get errorNetwork => 'No internet connection. Please try again.';

  @override
  String get errorServer =>
      'Something went wrong on our end. Please try again later.';

  @override
  String get errorData => 'We received unexpected data. Please try again.';

  @override
  String get errorCache => 'Could not read local data.';

  @override
  String get errorUnknown => 'An unexpected error occurred.';
}
