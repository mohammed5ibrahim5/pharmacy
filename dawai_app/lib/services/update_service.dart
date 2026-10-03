import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:http/http.dart' as http;
import 'package:package_info_plus/package_info_plus.dart';
import 'package:url_launcher/url_launcher.dart';
import '../config/theme.dart';

class UpdateService {
  static const MethodChannel _updateChannel =
      MethodChannel('com.dawai.dawai_app/updates');
  static const String _versionUrl =
      'https://raw.githubusercontent.com/mohammed5ibrahim5/pharmacy/master/version.json';

  static Future<void> checkForUpdates(BuildContext context) async {
    try {
      final packageInfo = await PackageInfo.fromPlatform();
      final currentVersion = packageInfo.version;

      final response =
          await http.get(Uri.parse(_versionUrl)).timeout(const Duration(seconds: 10));
      if (response.statusCode != 200) return;

      final data = json.decode(response.body);
      final latestVersion = data['latest_version'] as String;
      final downloadUrl = data['download_url'] as String;
      final releaseNotes = data['release_notes'] as String? ?? '';

      if (_isTrustedDownloadUrl(downloadUrl) &&
          isNewerVersion(latestVersion, currentVersion)) {
        if (!context.mounted) return;
        _showUpdateDialog(context, latestVersion, downloadUrl, releaseNotes);
      }
    } catch (e) {
      debugPrint('Update check failed: $e');
    }
  }

  static bool _isTrustedDownloadUrl(String value) {
    final uri = Uri.tryParse(value);
    final segments = uri?.pathSegments ?? const <String>[];
    return uri != null &&
        uri.scheme == 'https' &&
        uri.host == 'github.com' &&
        segments.length >= 5 &&
        segments[0] == 'mohammed5ibrahim5' &&
        segments[1] == 'pharmacy' &&
        segments[2] == 'releases' &&
        segments[3] == 'download';
  }

  static bool isNewerVersion(String latest, String current) {
    final latestParts = _parseVersion(latest);
    final currentParts = _parseVersion(current);
    if (latestParts == null || currentParts == null) return false;

    final count = latestParts.length > currentParts.length
        ? latestParts.length
        : currentParts.length;
    for (var index = 0; index < count; index++) {
      final latestPart = index < latestParts.length ? latestParts[index] : 0;
      final currentPart = index < currentParts.length ? currentParts[index] : 0;
      if (latestPart != currentPart) return latestPart > currentPart;
    }
    return false;
  }

  static List<int>? _parseVersion(String version) {
    final value = version.trim().replaceFirst(RegExp(r'^[vV]'), '');
    if (!RegExp(r'^\d+(?:\.\d+)*$').hasMatch(value)) return null;
    return value.split('.').map(int.parse).toList();
  }

  static void _showUpdateDialog(
    BuildContext context,
    String version,
    String downloadUrl,
    String releaseNotes,
  ) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: AppColors.primarySurfaceOf(context),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(Icons.system_update_rounded, color: AppColors.primary, size: 24),
            ),
            const SizedBox(width: 12),
            Text(
              'تحديث جديد متاح',
              style: GoogleFonts.tajawal(fontWeight: FontWeight.w800, fontSize: 18),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: AppColors.primarySurfaceOf(context),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                'الإصدار الجديد: $version',
                style: GoogleFonts.tajawal(
                  fontWeight: FontWeight.bold,
                  color: AppColors.primary,
                  fontSize: 13,
                ),
              ),
            ),
            if (releaseNotes.isNotEmpty) ...[
              const SizedBox(height: 12),
              Text(
                'ما الجديد:',
                style: GoogleFonts.tajawal(fontWeight: FontWeight.bold, fontSize: 14),
              ),
              const SizedBox(height: 4),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: AppColors.surfaceOf(context),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AppColors.borderOf(context)),
                ),
                child: Text(
                  releaseNotes,
                  style: GoogleFonts.tajawal(fontSize: 13, color: AppColors.textMutedOf(context)),
                ),
              ),
            ],
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: Text('لاحقاً', style: GoogleFonts.tajawal(color: AppColors.textMutedOf(context))),
          ),
          FilledButton.icon(
            icon: const Icon(Icons.download_rounded, size: 18),
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.primary,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            onPressed: () async {
              if (Platform.isAndroid) {
                try {
                  await _updateChannel.invokeMethod<void>(
                    'downloadAndInstallApk',
                    {'url': downloadUrl},
                  );
                  if (!context.mounted) return;
                  Navigator.of(context).pop();
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(
                        'بدأ تنزيل التحديث. عند اكتماله اضغط إشعار التنزيل لتثبيته.',
                        style: GoogleFonts.tajawal(),
                      ),
                    ),
                  );
                } on PlatformException catch (error) {
                  if (error.code != 'install_permission_required') {
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text(
                            error.message ?? 'تعذر بدء تنزيل التحديث.',
                            style: GoogleFonts.tajawal(),
                          ),
                        ),
                      );
                    }
                    return;
                  }

                  await _updateChannel.invokeMethod<void>(
                    'requestInstallPermission',
                  );
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text(
                          'فعّل السماح بتثبيت التطبيقات من هذا المصدر، ثم اضغط «تحديث الآن» مرة أخرى.',
                          style: GoogleFonts.tajawal(),
                        ),
                      ),
                    );
                  }
                }
              } else {
                final uri = Uri.parse(downloadUrl);
                if (await canLaunchUrl(uri)) {
                  await launchUrl(uri, mode: LaunchMode.externalApplication);
                }
              }
            },
            label: Text('تحديث الآن', style: GoogleFonts.tajawal(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }
}
