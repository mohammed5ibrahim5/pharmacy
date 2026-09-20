import { ShoppingCart } from 'lucide-react';

export function generateInvoicePdf(invoiceElement: HTMLDivElement, orderNumber: string): void {
  const clone = invoiceElement.cloneNode(true) as HTMLDivElement;

  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <title>فاتورة ${orderNumber}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');

    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    html { font-size: 14px; }
    body {
      font-family: 'Cairo', sans-serif;
      direction: rtl;
      background: #fff;
      color: #1a1a1a;
      padding: 32px;
      max-width: 800px;
      margin: 0 auto;
    }

    /* Print-friendly */
    @media print {
      body { padding: 0; }
      .no-print { display: none !important; }
      @page { margin: 12mm; size: A4; }
    }

    /* Ensure cloned styles render */
    .invoice-pdf-wrapper { width: 100%; }
    .invoice-pdf-wrapper table { width: 100%; border-collapse: collapse; }
    .invoice-pdf-wrapper th,
    .invoice-pdf-wrapper td { padding: 8px 12px; text-align: right; }
    .invoice-pdf-wrapper .text-white { color: #fff; }
    .invoice-pdf-wrapper .font-black { font-weight: 900; }
    .invoice-pdf-wrapper .font-bold { font-weight: 700; }
    .invoice-pdf-wrapper .text-center { text-align: center; }
    .invoice-pdf-wrapper .text-left { text-align: left; }
    .invoice-pdf-wrapper .mb-1 { margin-bottom: 0.25rem; }
    .invoice-pdf-wrapper .mb-2 { margin-bottom: 0.5rem; }
    .invoice-pdf-wrapper .mb-3 { margin-bottom: 0.75rem; }
    .invoice-pdf-wrapper .mb-4 { margin-bottom: 1rem; }
    .invoice-pdf-wrapper .mb-5 { margin-bottom: 1.25rem; }
    .invoice-pdf-wrapper .mb-6 { margin-bottom: 1.5rem; }
    .invoice-pdf-wrapper .mt-1 { margin-top: 0.25rem; }
    .invoice-pdf-wrapper .mt-2 { margin-top: 0.5rem; }
    .invoice-pdf-wrapper .px-3 { padding-left: 0.75rem; padding-right: 0.75rem; }
    .invoice-pdf-wrapper .px-4 { padding-left: 1rem; padding-right: 1rem; }
    .invoice-pdf-wrapper .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
    .invoice-pdf-wrapper .py-3 { padding-top: 0.75rem; padding-bottom: 0.75rem; }
    .invoice-pdf-wrapper .py-4 { padding-top: 1rem; padding-bottom: 1rem; }
    .invoice-pdf-wrapper .pt-4 { padding-top: 1rem; }
    .invoice-pdf-wrapper .pb-5 { padding-bottom: 1.25rem; }
    .invoice-pdf-wrapper .gap-3 { gap: 0.75rem; }
    .invoice-pdf-wrapper .gap-4 { gap: 1rem; }
    .invoice-pdf-wrapper .gap-1 { gap: 0.25rem; }
    .invoice-pdf-wrapper .gap-1\\.5 { gap: 0.375rem; }
    .invoice-pdf-wrapper .flex { display: flex; }
    .invoice-pdf-wrapper .inline-flex { display: inline-flex; }
    .invoice-pdf-wrapper .grid { display: grid; }
    .invoice-pdf-wrapper .items-center { align-items: center; }
    .invoice-pdf-wrapper .items-start { align-items: flex-start; }
    .invoice-pdf-wrapper .justify-between { justify-content: space-between; }
    .invoice-pdf-wrapper .justify-center { justify-content: center; }
    .invoice-pdf-wrapper .justify-end { justify-content: flex-end; }
    .invoice-pdf-wrapper .min-w-0 { min-width: 0; }
    .invoice-pdf-wrapper .shrink-0 { flex-shrink: 0; }
    .invoice-pdf-wrapper .w-full { width: 100%; }
    .invoice-pdf-wrapper .w-14 { width: 3.5rem; }
    .invoice-pdf-wrapper .h-14 { height: 3.5rem; }
    .invoice-pdf-wrapper .h-1\\.5 { height: 0.375rem; }
    .invoice-pdf-wrapper .w-1\\.5 { width: 0.375rem; }
    .invoice-pdf-wrapper .h-1\\.5 { height: 0.375rem; }
    .invoice-pdf-wrapper .rounded-2xl { border-radius: 1rem; }
    .invoice-pdf-wrapper .rounded-xl { border-radius: 0.75rem; }
    .invoice-pdf-wrapper .rounded-full { border-radius: 9999px; }
    .invoice-pdf-wrapper .shadow-md { box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
    .invoice-pdf-wrapper .shadow-lg { box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); }
    .invoice-pdf-wrapper .border { border: 1px solid #e5e7eb; }
    .invoice-pdf-wrapper .border-b { border-bottom: 1px solid #e5e7eb; }
    .invoice-pdf-wrapper .border-t-2 { border-top: 2px dashed #e5e7eb; }
    .invoice-pdf-wrapper .border-gray-100 { border-color: #f3f4f6; }
    .invoice-pdf-wrapper .border-gray-200 { border-color: #e5e7eb; }
    .invoice-pdf-wrapper .border-dashed { border-style: dashed; }
    .invoice-pdf-wrapper .bg-white { background-color: #fff; }
    .invoice-pdf-wrapper .bg-gray-50 { background-color: #f9fafb; }
    .invoice-pdf-wrapper .bg-amber-50 { background-color: #fffbeb; }
    .invoice-pdf-wrapper .border-amber-100 { border-color: #fef3c7; }
    .invoice-pdf-wrapper .text-gray-400 { color: #9ca3af; }
    .invoice-pdf-wrapper .text-gray-500 { color: #6b7280; }
    .invoice-pdf-wrapper .text-gray-600 { color: #4b5563; }
    .invoice-pdf-wrapper .text-gray-800 { color: #1f2937; }
    .invoice-pdf-wrapper .text-gray-900 { color: #111827; }
    .invoice-pdf-wrapper .text-amber-700 { color: #b45309; }
    .invoice-pdf-wrapper .text-sm { font-size: 0.875rem; }
    .invoice-pdf-wrapper .text-xs { font-size: 0.75rem; }
    .invoice-pdf-wrapper .text-lg { font-size: 1.125rem; }
    .invoice-pdf-wrapper .text-xl { font-size: 1.25rem; }
    .invoice-pdf-wrapper .text-2xl { font-size: 1.5rem; }
    .invoice-pdf-wrapper .text-\\[10px\\] { font-size: 10px; }
    .invoice-pdf-wrapper .text-\\[11px\\] { font-size: 11px; }
    .invoice-pdf-wrapper .text-\\[12px\\] { font-size: 12px; }
    .invoice-pdf-wrapper .tracking-widest { letter-spacing: 0.1em; }
    .invoice-pdf-wrapper .truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .invoice-pdf-wrapper .space-y-2 > * + * { margin-top: 0.5rem; }
    .invoice-pdf-wrapper .hidden { display: none; }
    .invoice-pdf-wrapper img { max-width: 100%; height: auto; object-fit: cover; }

    /* Inline style helpers */
    .invoice-pdf-wrapper [style*="background-color"] { border-radius: 1rem; }

    .print-header {
      text-align: center;
      padding-bottom: 16px;
      border-bottom: 2px solid #e5e7eb;
      margin-bottom: 20px;
      font-size: 10px;
      color: #9ca3af;
    }
  </style>
</head>
<body>
  <div class="no-print print-header">
    طباعة الفاتورة — ${orderNumber}
  </div>
  <div class="invoice-pdf-wrapper">
    ${clone.outerHTML}
  </div>
</body>
</html>`;

  const printWindow = window.open('', '_blank', 'width=800,height=600');
  if (!printWindow) {
    alert('يرجى السماح بفتح النوافذ المنبثقة للطابعة');
    return;
  }

  printWindow.document.write(html);
  printWindow.document.close();

  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
  };
}
