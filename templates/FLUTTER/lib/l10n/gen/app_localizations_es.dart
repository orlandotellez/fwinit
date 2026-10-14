// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Spanish Castilian (`es`).
class AppLocalizationsEs extends AppLocalizations {
  AppLocalizationsEs([String locale = 'es']) : super(locale);

  @override
  String get appTitle => 'fwiflu';

  @override
  String get appTagline =>
      'Clean Architecture, Riverpod y un sistema de diseño para claro y oscuro.';

  @override
  String get homeTitle => 'Inicio';

  @override
  String get homeWelcome => 'Empieza desde un sistema de diseño real.';

  @override
  String get homeSubtitle =>
      'Cada token de color, tamaño y movimiento se define una vez y se usa en todas partes.';

  @override
  String get homeCounterSubtitle => 'Una pantalla, un Notifier síncrono.';

  @override
  String get homeComponentsSubtitle =>
      'Todos los widgets compartidos, con sus estados.';

  @override
  String get homeDesignSubtitle =>
      'Tokens, color, tipografía, espaciado y movimiento.';

  @override
  String get homeExamplesSection => 'Ejemplos';

  @override
  String get counterTitle => 'Contador';

  @override
  String get counterReset => 'Reiniciar';

  @override
  String get counterIncrement => 'Incrementar';

  @override
  String get counterDecrement => 'Decrementar';

  @override
  String counterValue(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count veces',
      one: 'una vez',
      zero: 'ninguna vez',
    );
    return 'Has presionado el botón $_temp0';
  }

  @override
  String get postsTitle => 'Publicaciones';

  @override
  String get postsSubtitle =>
      'Se leen de una API remota a través de la capa de repositorio.';

  @override
  String get postDetailTitle => 'Detalle de la publicación';

  @override
  String postAuthor(int userId) {
    return 'Autor #$userId';
  }

  @override
  String get retry => 'Reintentar';

  @override
  String get cancel => 'Cancelar';

  @override
  String get comingSoon => 'Próximamente.';

  @override
  String get emptyPosts => 'Aún no hay publicaciones para mostrar.';

  @override
  String routeNotFound(String location) {
    return 'Página no encontrada: $location';
  }

  @override
  String get tabHome => 'Inicio';

  @override
  String get tabPosts => 'Publicaciones';

  @override
  String get tabProfile => 'Perfil';

  @override
  String get loginTitle => 'Bienvenido de nuevo';

  @override
  String get loginSubtitle =>
      'Todavía no hay backend. Inicia sesión para ver el flujo de navegación.';

  @override
  String get emailLabel => 'Correo';

  @override
  String get emailInvalid => 'Ingresa un correo válido.';

  @override
  String get passwordLabel => 'Contraseña';

  @override
  String get passwordTooShort => 'La contraseña es demasiado corta.';

  @override
  String get showPassword => 'Mostrar contraseña';

  @override
  String get hidePassword => 'Ocultar contraseña';

  @override
  String get loginButton => 'Iniciar sesión';

  @override
  String get logout => 'Cerrar sesión';

  @override
  String get logoutConfirmTitle => '¿Cerrar sesión?';

  @override
  String get logoutConfirmMessage => 'Tendrás que iniciar sesión de nuevo.';

  @override
  String get guestName => 'Usuario Demo';

  @override
  String get guestEmail => 'demo@example.com';

  @override
  String get profileAccountSection => 'Cuenta';

  @override
  String get profileAppearanceSection => 'Apariencia';

  @override
  String get themeModeLabel => 'Tema';

  @override
  String get themeModeSubtitle =>
      'Sigue tu dispositivo de forma predeterminada.';

  @override
  String get themeSystem => 'Sistema';

  @override
  String get themeLight => 'Claro';

  @override
  String get themeDark => 'Oscuro';

  @override
  String get profileNotifications => 'Notificaciones';

  @override
  String get profileAbout => 'Acerca de';

  @override
  String get profileAboutBody =>
      'Clean Architecture, Riverpod y un sistema de diseño para claro y oscuro.';

  @override
  String get componentsTitle => 'Componentes';

  @override
  String get componentsFoundation => 'Fundamentos';

  @override
  String get componentsColors => 'Color';

  @override
  String get componentsTypographySection => 'Tipografía';

  @override
  String get componentsSpacing => 'Espaciado y radios';

  @override
  String get componentsMotion => 'Movimiento';

  @override
  String get componentsStates => 'Estados';

  @override
  String get componentsButtons => 'Botones';

  @override
  String get componentsInputs => 'Entradas';

  @override
  String get componentsFeedback => 'Retroalimentación';

  @override
  String get componentsData => 'Visualización de datos';

  @override
  String get componentsCardExample =>
      'Las tarjetas agrupan contenido relacionado.';

  @override
  String get errorNetwork => 'Sin conexión a internet. Inténtalo de nuevo.';

  @override
  String get errorServer =>
      'Algo salió mal de nuestro lado. Inténtalo más tarde.';

  @override
  String get errorData => 'Recibimos datos inesperados. Inténtalo de nuevo.';

  @override
  String get errorCache => 'No se pudieron leer los datos locales.';

  @override
  String get errorUnknown => 'Ocurrió un error inesperado.';
}
