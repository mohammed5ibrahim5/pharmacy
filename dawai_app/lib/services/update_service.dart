import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:package_info_plus/package_info_plus.dart';
import 'package:url_launcher/url_launcher.dart';

class UpdateService {
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

      if (_isNewerVersion(latestVersion, currentVersion)) {
        if (!context.mounted) return;
        _showUpdateDialog(context, latestVersion, downloadUrl, releaseNotes);
      }
    } catch (e) {
      debugPrint('Update check failed: $e');
    }
  }

  static bool _isNewerVersion(String latest, String current) {
    try {
      final latestParts = latest.split('.').map((p) => int.tryParse(p) ?? 0).toList();
      final currentParts = current.split('.').map((p) => int.tryParse(p) ?? 0).toList();

      for (var i = 0; i < latestParts.length; i++) {
        if (i >= currentParts.length) return true;
        if (latestParts[i] > currentParts[i]) return true;
        if (latestParts[i] < currentParts[i]) return false;
      }
      return false;
    } catch (e) {
      debugPrint('Version parse error: $e');
      return false;
    }
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
        title: const Text('تحديث جديد متاح'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('النسخة الجديدة: $version'),
            if (releaseNotes.isNotEmpty) ...[
              const SizedBox(height: 8),
              const Text('التحديثات:',
                  style: TextStyle(fontWeight: FontWeight.bold)),
              const SizedBox(height: 4),
              Text(releaseNotes),
            ],
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('لاحقاً'),
          ),
          FilledButton(
            onPressed: () async {
              Navigator.of(context).pop();
              final uri = Uri.parse(downloadUrl);
              if (await canLaunchUrl(uri)) {
                await launchUrl(uri, mode: LaunchMode.externalApplication);
              }
            },
            child: const Text('تحديث'),
          ),
        ],
      ),
    );
  }
}
