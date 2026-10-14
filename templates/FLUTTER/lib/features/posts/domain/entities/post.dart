import 'package:freezed_annotation/freezed_annotation.dart';

part 'post.freezed.dart';

/// A domain entity representing a post.
///
/// Entities are pure: they live in the domain layer, know nothing about JSON
/// or the network, and are immutable. Data-layer DTOs map *into* this type.
@freezed
abstract class Post with _$Post {
  const factory Post({
    required int id,
    required int userId,
    required String title,
    required String body,
  }) = _Post;
}
