import 'package:flutter/material.dart';
import 'package:fwiflu/core/theme/app_colors.dart';

/// A circular avatar that shows an image when available and falls back to the
/// user's initials otherwise.
///
/// The ring is the design language's hairline; the fill is the muted surface.
class AppAvatar extends StatelessWidget {
  const AppAvatar({
    required this.name,
    this.imageUrl,
    this.radius = 20,
    super.key,
  });

  final String name;
  final String? imageUrl;
  final double radius;

  @override
  Widget build(BuildContext context) {
    final palette = context.palette;
    final hasImage = imageUrl != null && imageUrl!.isNotEmpty;

    return Container(
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        border: Border.all(color: palette.border),
      ),
      child: CircleAvatar(
        radius: radius,
        backgroundColor: palette.bgMuted,
        foregroundImage: hasImage ? NetworkImage(imageUrl!) : null,
        child: hasImage
            ? null
            : Text(
                _initials(name),
                style: TextStyle(
                  fontSize: radius * 0.8,
                  fontWeight: FontWeight.w600,
                  color: palette.textPrimary,
                ),
              ),
      ),
    );
  }

  static String _initials(String name) {
    final parts = name.trim().split(RegExp(r'\s+')).where((p) => p.isNotEmpty);
    if (parts.isEmpty) return '?';
    if (parts.length == 1) return parts.first.characters.first.toUpperCase();
    return (parts.first.characters.first + parts.last.characters.first)
        .toUpperCase();
  }
}
