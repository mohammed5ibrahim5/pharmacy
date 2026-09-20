import 'package:flutter_test/flutter_test.dart';
import 'package:dawai_app/models/customer.dart';

void main() {
  group('Customer', () {
    test('fromJson parses all fields', () {
      final json = {
        'id': 'cust1',
        'user_id': 'user1',
        'full_name': 'Ahmed Ali',
        'phone': '+20111222333',
        'email': 'ahmed@test.com',
        'avatar_url': 'https://example.com/avatar.png',
        'loyalty_points': 500,
        'created_at': '2025-06-01T12:00:00.000Z',
      };

      final customer = Customer.fromJson(json);

      expect(customer.id, 'cust1');
      expect(customer.userId, 'user1');
      expect(customer.fullName, 'Ahmed Ali');
      expect(customer.phone, '+20111222333');
      expect(customer.email, 'ahmed@test.com');
      expect(customer.avatarUrl, 'https://example.com/avatar.png');
      expect(customer.loyaltyPoints, 500);
      expect(customer.createdAt, DateTime.utc(2025, 6, 1, 12));
    });

    test('fromJson uses defaults for missing fields', () {
      final json = <String, dynamic>{
        'id': 'cust2',
        'email': 'basic@test.com',
      };

      final customer = Customer.fromJson(json);

      expect(customer.userId, isNull);
      expect(customer.fullName, isNull);
      expect(customer.phone, isNull);
      expect(customer.avatarUrl, isNull);
      expect(customer.loyaltyPoints, 0);
    });

    test('fromJson with null email defaults to empty string', () {
      final customer = Customer.fromJson({'id': 'cust3'});
      expect(customer.email, '');
    });
  });

  group('Review', () {
    test('fromJson parses all fields', () {
      final json = {
        'id': 'rev1',
        'pharmacy_id': 'ph1',
        'customer_id': 'cust1',
        'customer_name': 'Sara',
        'rating': 4.5,
        'comment': 'Great service',
        'created_at': '2025-07-10T09:00:00.000Z',
      };

      final review = Review.fromJson(json);

      expect(review.id, 'rev1');
      expect(review.pharmacyId, 'ph1');
      expect(review.customerId, 'cust1');
      expect(review.customerName, 'Sara');
      expect(review.rating, 4.5);
      expect(review.comment, 'Great service');
      expect(review.createdAt, DateTime.utc(2025, 7, 10, 9));
    });

    test('fromJson uses defaults for missing fields', () {
      final json = <String, dynamic>{};
      final review = Review.fromJson(json);

      expect(review.id, '');
      expect(review.pharmacyId, '');
      expect(review.customerId, isNull);
      expect(review.customerName, 'عميل');
      expect(review.rating, 5.0);
      expect(review.comment, isNull);
    });
  });

  group('CartItem', () {
    test('totalPrice computes price * quantity', () {
      final item = CartItem(
        key: 'k1',
        productId: 'p1',
        pharmacyId: 'ph1',
        productName: 'Paracetamol',
        price: 15.0,
        quantity: 3,
      );

      expect(item.totalPrice, 45.0);
    });

    test('totalPrice with default quantity 1', () {
      final item = CartItem(
        key: 'k2',
        productId: 'p2',
        pharmacyId: 'ph2',
        productName: 'Ibuprofen',
        price: 20.0,
      );

      expect(item.totalPrice, 20.0);
    });

    test('quantity can be mutated', () {
      final item = CartItem(
        key: 'k3',
        productId: 'p3',
        pharmacyId: 'ph3',
        productName: 'Vitamin',
        price: 10.0,
        quantity: 2,
      );

      item.quantity = 5;
      expect(item.totalPrice, 50.0);
    });

    test('defaults for optional fields', () {
      final item = CartItem(
        key: 'k4',
        productId: 'p4',
        pharmacyId: 'ph4',
        productName: 'Bandage',
        price: 5.0,
      );

      expect(item.unit, 'عبوة');
      expect(item.quantity, 1);
      expect(item.pharmacyName, isNull);
      expect(item.requiresPrescription, false);
      expect(item.imageUrl, isNull);
    });
  });

  group('SiteSettings', () {
    test('fromJson parses all fields', () {
      final json = {
        'site_name': 'My Pharmacy',
        'site_name_en': 'My Pharmacy EN',
        'site_tagline': 'Your health partner',
        'logo_url': 'https://example.com/logo.png',
        'primary_color': '#ff0000',
        'secondary_color': '#00ff00',
        'accent_color': '#0000ff',
        'contact_phone': '+20123456',
        'contact_whatsapp': '+20123456',
        'hero_title': 'Welcome',
        'hero_subtitle': 'Find your pharmacy',
        'announcement_active': true,
        'announcement_text': 'Sale now on!',
      };

      final settings = SiteSettings.fromJson(json);

      expect(settings.siteName, 'My Pharmacy');
      expect(settings.siteNameEn, 'My Pharmacy EN');
      expect(settings.siteTagline, 'Your health partner');
      expect(settings.logoUrl, 'https://example.com/logo.png');
      expect(settings.primaryColor, '#ff0000');
      expect(settings.secondaryColor, '#00ff00');
      expect(settings.accentColor, '#0000ff');
      expect(settings.contactPhone, '+20123456');
      expect(settings.contactWhatsapp, '+20123456');
      expect(settings.heroTitle, 'Welcome');
      expect(settings.heroSubtitle, 'Find your pharmacy');
      expect(settings.announcementActive, true);
      expect(settings.announcementText, 'Sale now on!');
    });

    test('fromJson uses defaults for missing fields', () {
      final json = <String, dynamic>{};
      final settings = SiteSettings.fromJson(json);

      expect(settings.siteName, 'صيدليتي');
      expect(settings.siteNameEn, isNull);
      expect(settings.siteTagline, '');
      expect(settings.logoUrl, isNull);
      expect(settings.primaryColor, '#0d9488');
      expect(settings.secondaryColor, '#0f766e');
      expect(settings.accentColor, '#f59e0b');
      expect(settings.contactPhone, isNull);
      expect(settings.contactWhatsapp, isNull);
      expect(settings.heroTitle, isNull);
      expect(settings.heroSubtitle, isNull);
      expect(settings.announcementActive, false);
      expect(settings.announcementText, isNull);
    });

    test('constructor defaults match factory defaults', () {
      final settings = SiteSettings();

      expect(settings.siteName, 'صيدليتي');
      expect(settings.siteTagline, 'صيدلياتك القريبة منك في مكان واحد');
      expect(settings.primaryColor, '#0d9488');
      expect(settings.secondaryColor, '#0f766e');
      expect(settings.accentColor, '#f59e0b');
      expect(settings.announcementActive, false);
    });
  });
}
