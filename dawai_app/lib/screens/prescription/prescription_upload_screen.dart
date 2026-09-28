import 'dart:io';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';
import 'package:go_router/go_router.dart';
import '../../config/theme.dart';

class PrescriptionUploadScreen extends StatefulWidget {
  const PrescriptionUploadScreen({super.key});

  @override
  State<PrescriptionUploadScreen> createState() => _PrescriptionUploadScreenState();
}

class _PrescriptionUploadScreenState extends State<PrescriptionUploadScreen> {
  File? _imageFile;
  String? _analysisResult;
  bool _analyzing = false;
  final ImagePicker _picker = ImagePicker();

  Future<void> _pickImage(ImageSource source) async {
    try {
      final picked = await _picker.pickImage(source: source, imageQuality: 85);
      if (picked == null) return;
      if (!mounted) return;
      setState(() {
        _imageFile = File(picked.path);
        _analysisResult = null;
      });
      await _analyzePrescription();
    } catch (e) {
      // pickImage throws a PlatformException when the camera permission is
      // denied, no camera is present, or the activity was destroyed; without
      // this the error escaped the tap handler with no feedback.
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('تعذّر فتح الكاميرا. تحقّق من إذن الوصول إليها.',
              style: GoogleFonts.tajawal()),
          backgroundColor: AppColors.error,
        ),
      );
    }
  }

  Future<void> _analyzePrescription() async {
    setState(() => _analyzing = true);
    // Stand-in for the real recognition step: there is no OCR endpoint yet,
    // so the copy must not claim that drugs were read off the image.
    await Future.delayed(const Duration(seconds: 2));
    if (!mounted) return;
    setState(() {
      _analyzing = false;
      _analysisResult = 'تم إرفاق الروشتة بنجاح.\n\n'
          'سيراجعها الصيدلي المختص ويجهّز الأدوية المذكورة فيها، '
          'وسيصلك إشعار عند تأكيد الطلب.';
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('رفع روشتة', style: GoogleFonts.tajawal(fontWeight: FontWeight.bold)),
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
                  Text('ارفع الروشتة وسنقوم بتحضير طلبك فوراً!', textAlign: TextAlign.center, style: GoogleFonts.tajawal(fontSize: 18, fontWeight: FontWeight.bold)),
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
                    label: Text('تصوير الكاميرا', style: GoogleFonts.tajawal(fontWeight: FontWeight.bold)),
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
                    label: Text('المعرض', style: GoogleFonts.tajawal(fontWeight: FontWeight.bold)),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      side: const BorderSide(color: AppColors.primary),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                ),
              ],
            ),
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
                      child: Image.file(_imageFile!, height: 300, width: double.infinity, fit: BoxFit.cover),
                    ),
                    const SizedBox(height: 16),
                    if (_analyzing)
                      Column(
                        children: [
                          const CircularProgressIndicator(),
                          const SizedBox(height: 16),
                          Text('جاري تحليل الروشتة...', style: GoogleFonts.tajawal(fontWeight: FontWeight.bold)),
                        ],
                      )
                    else if (_analysisResult != null)
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: AppColors.successSurfaceOf(context),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppColors.success.withValues(alpha: 0.3)),
                        ),
                        child: Column(
                          children: [
                            const Row(
                              children: [
                                Icon(Icons.check_circle, color: AppColors.success),
                                SizedBox(width: 8),
                                Text('تم تحليل الروشتة!', style: TextStyle(color: AppColors.success, fontWeight: FontWeight.bold)),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Text(_analysisResult!, style: GoogleFonts.tajawal(height: 1.5)),
                          ],
                        ),
                      ),
                  ],
                ),
              ),
            if (_analysisResult != null && !_analyzing)
              Padding(
                padding: const EdgeInsets.only(top: 24),
                child: SizedBox(
                  width: double.infinity,
                  height: 56,
                  child: ElevatedButton(
                    onPressed: () {
                      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('تم ارسال الروشتة!'), backgroundColor: AppColors.success));
                      context.push('/orders');
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    ),
                    child: Text('إرسال للصيدلية', style: GoogleFonts.tajawal(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
