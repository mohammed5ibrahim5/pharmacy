import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import '../models/order.dart';
import '../core/utils/format.dart';

class PdfService {
  static Future<void> generateOrderReceipt(OrderGroup order) async {
    final pdf = pw.Document();

    pdf.addPage(pw.MultiPage(
      pageFormat: PdfPageFormat.a5,
      textDirection: pw.TextDirection.rtl,
      build: (context) => [
        pw.Header(
          level: 0,
          child: pw.Row(
            mainAxisAlignment: pw.MainAxisAlignment.center,
            children: [
              pw.Text('دوا', style: pw.TextStyle(fontSize: 24, fontWeight: pw.FontWeight.bold)),
              pw.SizedBox(width: 8),
              pw.Text('فاتورة طلب', style: pw.TextStyle(fontSize: 16)),
            ],
          ),
        ),
        pw.Divider(),
        pw.SizedBox(height: 8),
        pw.Row(
          mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
          children: [
            pw.Text('رقم الطلب: #${shortId(order.id)}'),
            pw.Text('التاريخ: ${order.createdAt.day}/${order.createdAt.month}/${order.createdAt.year}'),
          ],
        ),
        pw.SizedBox(height: 16),
        pw.Text('المنتجات:', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 14)),
        pw.SizedBox(height: 8),
        pw.TableHelper.fromTextArray(
          headers: ['المنتج', 'العدد', 'السعر'],
          data: order.orders.isEmpty
              ? [
                  ['-', '-', '-'],
                ]
              : order.orders.map((item) => [
                  item.product?.name ?? '-',
                  '${item.quantity}',
                  '${item.totalPrice.toStringAsFixed(0)} ج.م',
                ]).toList(),
          headerStyle: pw.TextStyle(fontWeight: pw.FontWeight.bold),
          cellAlignment: pw.Alignment.center,
          headerAlignment: pw.Alignment.center,
        ),
        pw.Divider(),
        pw.SizedBox(height: 8),
        pw.Row(
          mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
          children: [
            pw.Text('رسوم التوصيل:', style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
            pw.Text('${order.deliveryFee.toStringAsFixed(0)} ج.م'),
          ],
        ),
        if (order.loyaltyDiscount > 0)
          pw.Row(
            mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
            children: [
              pw.Text('خصم نقاط الولاء:', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, color: PdfColors.green)),
              pw.Text('-${order.loyaltyDiscount.toStringAsFixed(0)} ج.م', style: pw.TextStyle(color: PdfColors.green)),
            ],
          ),
        pw.Divider(),
        pw.Row(
          mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
          children: [
            pw.Text('الإجمالي:', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 16)),
            pw.Text('${order.totalPrice.toStringAsFixed(0)} ج.م', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 16, color: PdfColors.teal)),
          ],
        ),
        pw.SizedBox(height: 16),
        pw.Row(
          mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
          children: [
            pw.Text('طريقة الدفع: ${_paymentLabel(order.paymentMethod)}'),
            pw.Text('العنوان: ${order.address ?? '-'}'),
          ],
        ),
        if (order.note != null && order.note!.isNotEmpty) ...[
          pw.SizedBox(height: 8),
          pw.Text('ملاحظات: ${order.note}', style: pw.TextStyle(fontStyle: pw.FontStyle.italic)),
        ],
        pw.SizedBox(height: 24),
        pw.Center(
          child: pw.Text('شكرا لاستخدامك دوا', style: pw.TextStyle(color: PdfColors.grey, fontSize: 12)),
        ),
      ],
    ));

    await Printing.layoutPdf(
      onLayout: (format) async => pdf.save(),
      name: 'فاتورة_${shortId(order.id)}',
    );
  }

  static String _paymentLabel(String? method) {
    switch (method) {
      case 'cash': return 'كاش';
      case 'vodafone_cash': return 'فودافون كاش';
      case 'instapay': return 'انستاباي';
      default: return method ?? '-';
    }
  }
}
