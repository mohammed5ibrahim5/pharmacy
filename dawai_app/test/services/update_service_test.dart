import 'package:dawai_app/services/update_service.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('UpdateService.isNewerVersion', () {
    test('detects a greater patch version', () {
      expect(UpdateService.isNewerVersion('1.1.2', '1.1.1'), isTrue);
    });

    test('compares all numeric version segments', () {
      expect(UpdateService.isNewerVersion('1.10.0', '1.9.9'), isTrue);
      expect(UpdateService.isNewerVersion('1.2', '1.2.0'), isFalse);
      expect(UpdateService.isNewerVersion('1.2.0', '1.2'), isFalse);
    });

    test('accepts an optional v prefix', () {
      expect(UpdateService.isNewerVersion('v2.0.0', '1.9.9'), isTrue);
    });

    test('rejects equal, older, and invalid versions', () {
      expect(UpdateService.isNewerVersion('1.1.1', '1.1.1'), isFalse);
      expect(UpdateService.isNewerVersion('1.1.0', '1.1.1'), isFalse);
      expect(UpdateService.isNewerVersion('latest', '1.1.1'), isFalse);
    });
  });
}
