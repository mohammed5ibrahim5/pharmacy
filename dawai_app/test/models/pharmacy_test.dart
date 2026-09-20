import 'package:flutter_test/flutter_test.dart';
import 'package:dawai_app/models/pharmacy.dart';

void main() {
  group('Pharmacy', () {
    test('fromJson parses all fields correctly', () {
      final json = {
        'id': 'ph1',
        'name': 'Al-Salam',
        'name_en': 'Al-Salam EN',
        'description': 'Best pharmacy',
        'logo_url': 'https://example.com/logo.png',
        'cover_url': 'https://example.com/cover.png',
        'phone': '+20123456789',
        'whatsapp': '+20123456789',
        'email': 'info@pharmacy.com',
        'address': '123 Main St',
        'area': 'Downtown',
        'city': 'Cairo',
        'latitude': 30.0444,
        'longitude': 31.2357,
        'is_active': false,
        'rating': 4.5,
        'delivery_available': true,
        'delivery_fee': 25.0,
        'opening_hours': '9AM-10PM',
        'is_24h': false,
        'has_parking': true,
        'accept_insurance': true,
        'website_url': 'https://pharmacy.com',
        'pharmacy_type': 'chain',
        'commission_rate': 10.5,
        'subscription_plan': 'premium',
        'created_at': '2025-03-01T08:00:00.000Z',
      };

      final pharmacy = Pharmacy.fromJson(json);

      expect(pharmacy.id, 'ph1');
      expect(pharmacy.name, 'Al-Salam');
      expect(pharmacy.nameEn, 'Al-Salam EN');
      expect(pharmacy.description, 'Best pharmacy');
      expect(pharmacy.logoUrl, 'https://example.com/logo.png');
      expect(pharmacy.coverUrl, 'https://example.com/cover.png');
      expect(pharmacy.phone, '+20123456789');
      expect(pharmacy.whatsapp, '+20123456789');
      expect(pharmacy.email, 'info@pharmacy.com');
      expect(pharmacy.address, '123 Main St');
      expect(pharmacy.area, 'Downtown');
      expect(pharmacy.city, 'Cairo');
      expect(pharmacy.latitude, 30.0444);
      expect(pharmacy.longitude, 31.2357);
      expect(pharmacy.isActive, false);
      expect(pharmacy.rating, 4.5);
      expect(pharmacy.deliveryAvailable, true);
      expect(pharmacy.deliveryFee, 25.0);
      expect(pharmacy.openingHours, '9AM-10PM');
      expect(pharmacy.is24h, false);
      expect(pharmacy.hasParking, true);
      expect(pharmacy.acceptInsurance, true);
      expect(pharmacy.websiteUrl, 'https://pharmacy.com');
      expect(pharmacy.pharmacyType, 'chain');
      expect(pharmacy.commissionRate, 10.5);
      expect(pharmacy.subscriptionPlan, 'premium');
      expect(pharmacy.createdAt, DateTime.utc(2025, 3, 1, 8));
    });

    test('fromJson uses defaults for missing fields', () {
      final json = <String, dynamic>{
        'id': 'ph2',
        'name': 'Quick Rx',
        'address': '456 Oak Ave',
      };

      final pharmacy = Pharmacy.fromJson(json);

      expect(pharmacy.nameEn, isNull);
      expect(pharmacy.description, isNull);
      expect(pharmacy.logoUrl, isNull);
      expect(pharmacy.coverUrl, isNull);
      expect(pharmacy.phone, isNull);
      expect(pharmacy.whatsapp, isNull);
      expect(pharmacy.email, isNull);
      expect(pharmacy.area, isNull);
      expect(pharmacy.city, isNull);
      expect(pharmacy.latitude, 0);
      expect(pharmacy.longitude, 0);
      expect(pharmacy.isActive, true);
      expect(pharmacy.rating, 5.0);
      expect(pharmacy.deliveryAvailable, false);
      expect(pharmacy.deliveryFee, 0);
      expect(pharmacy.openingHours, isNull);
      expect(pharmacy.is24h, false);
      expect(pharmacy.hasParking, false);
      expect(pharmacy.acceptInsurance, false);
      expect(pharmacy.websiteUrl, isNull);
      expect(pharmacy.pharmacyType, isNull);
      expect(pharmacy.commissionRate, isNull);
      expect(pharmacy.subscriptionPlan, isNull);
    });

    test('fromJson handles integer coordinates', () {
      final json = {
        'id': 'ph3',
        'name': 'Int Coords',
        'address': 'Addr',
        'latitude': 30,
        'longitude': 31,
        'delivery_fee': 5,
        'rating': 4,
      };

      final pharmacy = Pharmacy.fromJson(json);
      expect(pharmacy.latitude, 30.0);
      expect(pharmacy.longitude, 31.0);
      expect(pharmacy.deliveryFee, 5.0);
      expect(pharmacy.rating, 4.0);
    });

    test('fromJson handles invalid date gracefully', () {
      final json = {
        'id': 'ph4',
        'name': 'Bad Date',
        'address': 'Addr',
        'created_at': 'invalid',
      };

      final pharmacy = Pharmacy.fromJson(json);
      expect(pharmacy.createdAt, isA<DateTime>());
    });

    test('fromJson with null created_at', () {
      final json = {
        'id': 'ph5',
        'name': 'Null Date',
        'address': 'Addr',
      };

      final pharmacy = Pharmacy.fromJson(json);
      expect(pharmacy.createdAt, isA<DateTime>());
    });
  });
}
