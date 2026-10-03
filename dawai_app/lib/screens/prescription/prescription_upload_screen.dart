import 'dart:io';

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../config/theme.dart';
import '../../core/utils/api_error.dart';
import '../../providers/language_provider.dart';
import '../../services/api_service.dart';

class PrescriptionUploadScreen extends StatefulWidget {
  const PrescriptionUploadScreen({super.key});

  @override
  State<PrescriptionUploadScreen> createState() => _PrescriptionUploadScreenState();
}

class _PrescriptionUploadScreenState extends State<PrescriptionUploadScreen> {
  XFile? _imageFile;
  final _patientNameCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _notesCtrl = TextEditingController();
  bool _submitting = false;
  bool _submitted = false;
  final ImagePicker _picker = ImagePicker();

  @override
  void dispose() {
    _patientNameCtrl.dispose();
    _phoneCtrl.dispose();
    _notesCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickImage(ImageSource source) async {
    try {
      final picked = await _picker.pickImage(
        source: source,
        imageQuality: 85,
        maxWidth: 1920,
        maxHeight: 1920,
      );
      if (picked == null) return;
      if (!mounted) return;
      setState(() {
        _imageFile = picked;
        _submitted = false;
      });
    } catch (_) {
      // pickImage throws a PlatformException when the camera permission is
      // denied, no camera is present, or the activity was destroyed; without
      // this the error escaped the tap handler with no feedback.
      if (!mounted) return;
      final lang = context.read<LanguageProvider>();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(lang.t('prescription_pick_failed'), style: GoogleFonts.tajawal()),
          backgroundColor: AppColors.error,
        ),
      );
    }
  }

  Future<void> _submitPrescription() async {
    final lang = context.read<LanguageProvider>();
    final user = ApiService().currentUser;
    if (user == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(lang.t('prescription_login_required'))),
      );
      context.push('/login');
      return;
    }
    if (_imageFile == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(lang.t('prescription_pick_first'))),
      );
      return;
    }
    final phone = _phoneCtrl.text.trim();
    final digits = phone.replaceAll(RegExp(r'\D'), '');
    if (digits.length < 8 || digits.length > 15) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(lang.t('prescription_phone_required'))),
      );
      return;
    }
    if (_patientNameCtrl.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(lang.t('prescription_patient_required'))),
      );
      return;
    }

    final pickedMimeType = _imageFile!.mimeType?.toLowerCase();
    final fileExtension = _imageFile!.name.split('.').last.toLowerCase();
    final mimeType = pickedMimeType ??
        switch (fileExtension) {
          'jpg' || 'jpeg' => 'image/jpeg',
          'png' => 'image/png',
          'webp' => 'image/webp',
          _ => null,
        };
    final extension = switch (mimeType) {
      'image/jpeg' => 'jpg',
      'image/png' => 'png',
      'image/webp' => 'webp',
      _ => null,
    };
    if (extension == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(lang.t('prescription_unsupported_image'))),
      );
      return;
    }

    setState(() => _submitting = true);
    try {
      final imageBytes = await _imageFile!.readAsBytes();
      if (imageBytes.length > 10 * 1024 * 1024) {
        throw ArgumentError(lang.t('prescription_image_too_large'));
      }
      await ApiService().submitPrescription(
        imageBytes: imageBytes,
        extension: extension,
        contentType: mimeType!,
        patientName: _patientNameCtrl.text.trim(),
        phone: phone,
        notes: _notesCtrl.text,
      );
      if (!mounted) return;
      setState(() => _submitted = true);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(lang.t('prescription_submission_success')),
          backgroundColor: AppColors.success,
        ),
      );
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            friendlyError(
              error,
              fallback: lang.t('prescription_submission_error'),
            ),
            style: GoogleFonts.tajawal(),
          ),
          backgroundColor: AppColors.error,
        ),
      );
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final lang = context.watch<LanguageProvider>();
    return Scaffold(
      appBar: AppBar(
        title: Text(lang.t('prescription_title'), style: GoogleFonts.tajawal(fontWeight: FontWeight.bold)),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: AppColors.primarySurfaceOf(context),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.primaryLight),
              ),
              child: Column(
                children: [
                  const Icon(Icons.document_scanner, size: 64, color: AppColors.primary),
                  const SizedBox(height: 16),
                  Text(lang.t('prescription_upload_prompt'), textAlign: TextAlign.center, style: GoogleFonts.tajawal(fontSize: 18, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  Text(
                    lang.t('prescription_pending_review'),
                    textAlign: TextAlign.center,
                    style: GoogleFonts.tajawal(fontSize: 13, height: 1.5),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () => _pickImage(ImageSource.camera),
                    icon: const Icon(Icons.camera_alt),
                    label: Text(lang.t('prescription_take_photo'), style: GoogleFonts.tajawal(fontWeight: FontWeight.bold)),
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      backgroundColor: AppColors.primary,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => _pickImage(ImageSource.gallery),
                    icon: const Icon(Icons.photo_library),
                    label: Text(lang.t('prescription_pick_gallery'), style: GoogleFonts.tajawal(fontWeight: FontWeight.bold)),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      side: const BorderSide(color: AppColors.primary),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                ),
              ],
            ),
            if (ApiService().currentUser == null) ...[
              const SizedBox(height: 16),
              Text(
                lang.t('prescription_login_required'),
                textAlign: TextAlign.center,
                style: GoogleFonts.tajawal(color: AppColors.textMutedOf(context)),
              ),
              const SizedBox(height: 8),
              OutlinedButton.icon(
                onPressed: () => context.push('/login'),
                icon: const Icon(Icons.login),
                label: Text(lang.t('prescription_sign_in')),
              ),
            ],
            const SizedBox(height: 24),
            if (_imageFile != null)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.surfaceOf(context),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.borderOf(context)),
                ),
                child: Column(
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: Image.file(File(_imageFile!.path), height: 300, width: double.infinity, fit: BoxFit.cover),
                    ),
                    const SizedBox(height: 16),
                    if (_submitted)
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: AppColors.successSurfaceOf(context),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppColors.success.withValues(alpha: 0.3)),
                        ),
                        child: Column(
                          children: [
                            Row(
                              children: [
                                const Icon(Icons.check_circle, color: AppColors.success),
                                const SizedBox(width: 8),
                                Flexible(
                                  child: Text(
                                    lang.t('prescription_submission_success'),
                                    style: GoogleFonts.tajawal(
                                      color: AppColors.success,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Text(
                              lang.t('prescription_pending_review'),
                              style: GoogleFonts.tajawal(height: 1.5),
                            ),
                          ],
                        ),
                      ),
                  ],
                ),
              ),
            if (ApiService().currentUser != null) ...[
              const SizedBox(height: 16),
              TextField(
                controller: _patientNameCtrl,
                textInputAction: TextInputAction.next,
                decoration: InputDecoration(
                  labelText: lang.t('prescription_patient_name'),
                  prefixIcon: const Icon(Icons.person_outline),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _phoneCtrl,
                keyboardType: TextInputType.phone,
                textDirection: TextDirection.ltr,
                textInputAction: TextInputAction.next,
                decoration: InputDecoration(
                  labelText: lang.t('prescription_phone'),
                  prefixIcon: const Icon(Icons.phone_outlined),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _notesCtrl,
                maxLines: 3,
                decoration: InputDecoration(
                  labelText: lang.t('prescription_notes'),
                  prefixIcon: const Icon(Icons.notes_outlined),
                ),
              ),
            ],
            if (_imageFile != null && !_submitted)
              Padding(
                padding: const EdgeInsets.only(top: 24),
                child: SizedBox(
                  width: double.infinity,
                  height: 56,
                  child: ElevatedButton(
                    onPressed: _submitting ? null : _submitPrescription,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    ),
                    child: _submitting
                        ? const CircularProgressIndicator(color: Colors.white)
                        : Text(lang.t('prescription_submit'), style: GoogleFonts.tajawal(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
