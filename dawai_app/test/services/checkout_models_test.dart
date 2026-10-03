import 'package:flutter_test/flutter_test.dart';
import 'package:dawai_app/services/api_service.dart';

void main() {
  group('CheckoutConfig', () {
    test('uses the same safe defaults as the order backend', () {
      const config = CheckoutConfig();

      expect(config.showCashOnDelivery, isTrue);
      expect(config.deliveryFee, 25);
      expect(config.freeDeliveryThreshold, 300);
      expect(config.cashOnDeliveryFee, 10);
    });
  });

  group('ApprovedPrescription', () {
    test('shows the reference and reviewed medicine in its label', () {
      final prescription = ApprovedPrescription.fromJson({
        'id': '12345678-aaaa-bbbb-cccc-123456789012',
        'reference_code': 'RX-2026-1234',
        'ocr_data': {'drug_name': 'Panadol'},
      });

      expect(prescription.id, '12345678-aaaa-bbbb-cccc-123456789012');
      expect(prescription.label, 'RX-2026-1234 · Panadol');
      expect(prescription.drugName, 'Panadol');
    });

    test('falls back to an id prefix when there is no reference', () {
      final prescription = ApprovedPrescription.fromJson({
        'id': '12345678-aaaa-bbbb-cccc-123456789012',
        'ocr_data': <String, dynamic>{},
      });

      expect(prescription.label, '12345678');
      expect(prescription.drugName, isNull);
    });
  });
}
