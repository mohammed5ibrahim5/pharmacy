import 'package:flutter_test/flutter_test.dart';
import 'package:dawai_app/models/product.dart';

void main() {
  group('Product', () {
    test('fromJson parses all fields correctly', () {
      final json = {
        'id': 'p1',
        'pharmacy_id': 'ph1',
        'category_id': 'c1',
        'name': 'Paracetamol',
        'name_en': 'Paracetamol EN',
        'description': 'Pain reliever',
        'image_url': 'https://example.com/img.png',
        'price': 15.5,
        'unit': 'strip',
        'is_available': false,
        'requires_prescription': true,
        'active_ingredient': 'Acetaminophen',
        'manufacturer': 'PharmaCo',
        'form': 'tablet',
        'dosage': '500mg',
        'how_to_use': 'Take one tablet',
        'contraindications': 'Liver disease',
        'interactions': 'Blood thinners',
        'stock_quantity': 100,
        'barcode': '123456789',
        'for_all_pharmacies': true,
        'created_at': '2025-01-15T10:30:00.000Z',
      };

      final product = Product.fromJson(json);

      expect(product.id, 'p1');
      expect(product.pharmacyId, 'ph1');
      expect(product.categoryId, 'c1');
      expect(product.name, 'Paracetamol');
      expect(product.nameEn, 'Paracetamol EN');
      expect(product.description, 'Pain reliever');
      expect(product.imageUrl, 'https://example.com/img.png');
      expect(product.price, 15.5);
      expect(product.unit, 'strip');
      expect(product.isAvailable, false);
      expect(product.requiresPrescription, true);
      expect(product.activeIngredient, 'Acetaminophen');
      expect(product.manufacturer, 'PharmaCo');
      expect(product.form, 'tablet');
      expect(product.dosage, '500mg');
      expect(product.howToUse, 'Take one tablet');
      expect(product.contraindications, 'Liver disease');
      expect(product.interactions, 'Blood thinners');
      expect(product.stockQuantity, 100);
      expect(product.barcode, '123456789');
      expect(product.forAllPharmacies, true);
      expect(product.createdAt, DateTime.utc(2025, 1, 15, 10, 30));
    });

    test('fromJson uses defaults for missing fields', () {
      final json = <String, dynamic>{
        'id': 'p2',
        'name': 'Ibuprofen',
        'price': 20,
      };

      final product = Product.fromJson(json);

      expect(product.pharmacyId, '');
      expect(product.categoryId, isNull);
      expect(product.nameEn, isNull);
      expect(product.description, isNull);
      expect(product.imageUrl, isNull);
      expect(product.unit, 'عبوة');
      expect(product.isAvailable, true);
      expect(product.requiresPrescription, false);
      expect(product.stockQuantity, 0);
      expect(product.forAllPharmacies, false);
      expect(product.pharmacy, isNull);
      expect(product.category, isNull);
    });

    test('fromJson handles invalid date by falling back to DateTime.now()', () {
      final json = {
        'id': 'p3',
        'name': 'Aspirin',
        'price': 10,
        'created_at': 'not-a-date',
      };

      final product = Product.fromJson(json);
      expect(product.createdAt, isA<DateTime>());
    });

    test('fromJson parses nested pharmacy reference', () {
      final json = {
        'id': 'p4',
        'name': 'Vitamin C',
        'price': 25,
        'pharmacy': {
          'id': 'ph10',
          'name': 'City Pharmacy',
          'logo_url': 'https://example.com/logo.png',
          'delivery_fee': 5.0,
          'delivery_available': true,
        },
      };

      final product = Product.fromJson(json);
      expect(product.pharmacy, isA<PharmacyRef>());
      expect(product.pharmacy!.id, 'ph10');
      expect(product.pharmacy!.name, 'City Pharmacy');
      expect(product.pharmacy!.logoUrl, 'https://example.com/logo.png');
      expect(product.pharmacy!.deliveryFee, 5.0);
      expect(product.pharmacy!.deliveryAvailable, true);
    });

    test('fromJson parses nested category reference', () {
      final json = {
        'id': 'p5',
        'name': 'Panadol',
        'price': 12,
        'category': {
          'id': 'c5',
          'name': 'Pain Relief',
          'slug': 'pain-relief',
          'icon': 'medication',
        },
      };

      final product = Product.fromJson(json);
      expect(product.category, isA<CategoryRef>());
      expect(product.category!.id, 'c5');
      expect(product.category!.name, 'Pain Relief');
      expect(product.category!.slug, 'pain-relief');
      expect(product.category!.icon, 'medication');
    });

    test('fromJson handles price as int', () {
      final json = {'id': 'p6', 'name': 'X', 'price': 30};
      final product = Product.fromJson(json);
      expect(product.price, 30.0);
    });
  });

  group('PharmacyRef', () {
    test('fromJson with all fields', () {
      final json = {
        'id': 'ph1',
        'name': 'Al-Nour',
        'logo_url': 'https://img.com/logo.png',
        'delivery_fee': 10.0,
        'delivery_available': true,
      };

      final ref = PharmacyRef.fromJson(json);
      expect(ref.id, 'ph1');
      expect(ref.name, 'Al-Nour');
      expect(ref.logoUrl, 'https://img.com/logo.png');
      expect(ref.deliveryFee, 10.0);
      expect(ref.deliveryAvailable, true);
    });

    test('fromJson with missing optional fields', () {
      final ref = PharmacyRef.fromJson({});
      expect(ref.id, '');
      expect(ref.name, '');
      expect(ref.logoUrl, isNull);
      expect(ref.deliveryFee, isNull);
      expect(ref.deliveryAvailable, isNull);
    });
  });

  group('ProductRef', () {
    test('fromJson with all fields', () {
      final ref = ProductRef.fromJson({
        'id': 'pr1',
        'name': 'Gel',
        'image_url': 'https://img.com/gel.png',
        'unit': 'tube',
      });
      expect(ref.id, 'pr1');
      expect(ref.name, 'Gel');
      expect(ref.imageUrl, 'https://img.com/gel.png');
      expect(ref.unit, 'tube');
    });

    test('fromJson with missing optional fields', () {
      final ref = ProductRef.fromJson({});
      expect(ref.id, '');
      expect(ref.name, '');
      expect(ref.imageUrl, isNull);
      expect(ref.unit, isNull);
    });
  });

  group('CategoryRef', () {
    test('fromJson with all fields', () {
      final ref = CategoryRef.fromJson({
        'id': 'c1',
        'name': 'Vitamins',
        'slug': 'vitamins',
        'icon': 'local_pharmacy',
      });
      expect(ref.id, 'c1');
      expect(ref.name, 'Vitamins');
      expect(ref.slug, 'vitamins');
      expect(ref.icon, 'local_pharmacy');
    });

    test('fromJson with missing optional fields', () {
      final ref = CategoryRef.fromJson({});
      expect(ref.id, '');
      expect(ref.name, '');
      expect(ref.slug, isNull);
      expect(ref.icon, isNull);
    });
  });
}
