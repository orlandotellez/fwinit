/// Type-safe route definitions.
///
/// Using an enum for route names avoids stringly-typed navigation bugs.
/// Reference routes as `AppRoute.posts.name` / `AppRoute.posts.path`.
enum AppRoute {
  login('/login'),
  home('/home'),
  counter('/home/counter'),
  components('/home/components'),
  posts('/posts'),
  postDetail('/posts/:id'),
  profile('/profile');

  const AppRoute(this.path);

  /// The URL path for this route.
  final String path;
}
