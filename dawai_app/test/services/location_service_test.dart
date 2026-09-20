import 'dart:math';
import 'package:flutter_test/flutter_test.dart';
import 'package:dawai_app/services/location_service.dart';

void main() {
  final service = LocationService();

  group('calculateDistance', () {
    test('same point returns 0', () {
      final distance = service.calculateDistance(30.0, 31.0, 30.0, 31.0);
      expect(distance, 0.0);
    });

    test('known distance Cairo to Alexandria ~ 182 km', () {
      // Cairo downtown approx 30.0444, 31.2357
      // Alexandria approx 31.2001, 29.9187
      final distance = service.calculateDistance(30.0444, 31.2357, 31.2001, 29.9187);
      // Should be roughly 180-190 km
      expect(distance, greaterThan(170000));
      expect(distance, lessThan(200000));
    });

    test('small distance within city ~ hundreds of meters', () {
      // Two points ~0.001 degree apart (~111m per degree at equator, ~97m at 30deg lat)
      final distance = service.calculateDistance(30.0, 31.0, 30.001, 31.001);
      expect(distance, greaterThan(100));
      expect(distance, lessThan(250));
    });

    test('distance is symmetric', () {
      final d1 = service.calculateDistance(30.0, 31.0, 31.0, 32.0);
      final d2 = service.calculateDistance(31.0, 32.0, 30.0, 31.0);
      expect(d1, closeTo(d2, 0.001));
    });

    test('diagonal distance is larger than horizontal for same delta', () {
      final horizontal = service.calculateDistance(0.0, 0.0, 0.0, 1.0);
      final vertical = service.calculateDistance(0.0, 0.0, 1.0, 0.0);
      final diagonal = service.calculateDistance(0.0, 0.0, 1.0, 1.0);
      expect(diagonal, greaterThan(horizontal));
      expect(diagonal, greaterThan(vertical));
    });
  });

  group('formatDistance', () {
    test('formats meters when less than 1000', () {
      expect(service.formatDistance(500), '500 م');
    });

    test('formats 0 meters', () {
      expect(service.formatDistance(0), '0 م');
    });

    test('formats 999 meters', () {
      expect(service.formatDistance(999), '999 م');
    });

    test('formats kilometers when >= 1000', () {
      expect(service.formatDistance(1000), '1.0 كم');
    });

    test('formats large kilometer distance', () {
      expect(service.formatDistance(15500), '15.5 كم');
    });

    test('formats exactly 1000 as 1.0 km', () {
      expect(service.formatDistance(1000), '1.0 كم');
    });

    test('formats decimal meters rounded', () {
      expect(service.formatDistance(1234), '1.2 كم');
    });

    test('formats 999.9 meters (rounded up) as meters', () {
      expect(service.formatDistance(999.9), '1000 م');
    });
  });
}
