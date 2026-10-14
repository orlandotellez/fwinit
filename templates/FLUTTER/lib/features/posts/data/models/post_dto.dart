import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:fwiflu/features/posts/domain/entities/post.dart';

part 'post_dto.freezed.dart';
part 'post_dto.g.dart';

/// Data Transfer Object for a post as returned by the API.
///
/// DTOs live in the data layer and mirror the wire format exactly. Keeping
/// them separate from the [Post] domain entity means an API change only
/// ripples through the mapping in [toEntity] — not your whole app.
@freezed
abstract class PostDto with _$PostDto {
  const PostDto._();

  const factory PostDto({
    required int id,
    required int userId,
    required String title,
    required String body,
  }) = _PostDto;

  factory PostDto.fromJson(Map<String, dynamic> json) =>
      _$PostDtoFromJson(json);

  /// Maps this DTO to its domain [Post] entity.
  Post toEntity() => Post(id: id, userId: userId, title: title, body: body);
}
