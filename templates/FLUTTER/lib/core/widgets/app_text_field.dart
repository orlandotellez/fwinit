import 'package:flutter/material.dart';
import 'package:fwiflu/core/theme/app_colors.dart';
import 'package:fwiflu/core/theme/app_typography.dart';
import 'package:fwiflu/l10n/l10n.dart';

/// A labeled text input built on [TextFormField].
///
/// Centralizes look-and-feel (label, hint, icons) and supports password fields
/// with a built-in show/hide toggle via [obscurable].
///
/// The label is rendered as the design language's quiet uppercase label and
/// always floats into the border notch, which keeps the field's accessible
/// label intact while staying on-brand. Note that `String.toUpperCase` is
/// locale-independent; revisit this if the app ships a locale whose casing
/// rules differ (for example Turkish).
class AppTextField extends StatefulWidget {
  const AppTextField({
    required this.label,
    this.controller,
    this.hint,
    this.prefixIcon,
    this.obscurable = false,
    this.keyboardType,
    this.textInputAction,
    this.validator,
    this.onChanged,
    this.onSubmitted,
    this.enabled = true,
    super.key,
  });

  final String label;
  final TextEditingController? controller;
  final String? hint;
  final IconData? prefixIcon;

  /// When true, the field hides its content and shows a visibility toggle
  /// (use for passwords).
  final bool obscurable;
  final TextInputType? keyboardType;
  final TextInputAction? textInputAction;
  final String? Function(String?)? validator;
  final ValueChanged<String>? onChanged;
  final ValueChanged<String>? onSubmitted;
  final bool enabled;

  @override
  State<AppTextField> createState() => _AppTextFieldState();
}

class _AppTextFieldState extends State<AppTextField> {
  late bool _obscured = widget.obscurable;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final palette = context.palette;

    return TextFormField(
      controller: widget.controller,
      obscureText: _obscured,
      keyboardType: widget.keyboardType,
      textInputAction: widget.textInputAction,
      validator: widget.validator,
      onChanged: widget.onChanged,
      onFieldSubmitted: widget.onSubmitted,
      enabled: widget.enabled,
      style: TextStyle(fontSize: 16, color: palette.textPrimary),
      decoration: InputDecoration(
        labelText: widget.label.toUpperCase(),
        floatingLabelBehavior: FloatingLabelBehavior.always,
        labelStyle: AppTypography.sectionLabel(palette.textFaint),
        hintText: widget.hint,
        prefixIcon: widget.prefixIcon == null ? null : Icon(widget.prefixIcon),
        suffixIcon: widget.obscurable
            ? IconButton(
                onPressed: () => setState(() => _obscured = !_obscured),
                icon: Icon(
                  _obscured
                      ? Icons.visibility_off_outlined
                      : Icons.visibility_outlined,
                ),
                tooltip: _obscured ? l10n.showPassword : l10n.hidePassword,
              )
            : null,
      ),
    );
  }
}
