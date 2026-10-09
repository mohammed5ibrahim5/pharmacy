export interface InvoiceItem {
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface InvoiceOptions {
  siteName: string;
  title: string;
  pharmacyName: string;
  dateLabel: string;
  items: InvoiceItem[];
  subtotal: number;
  total: number;
  currency: string;
  customerLabel: string;
  customerName?: string;
  customerPhone?: string;
  subtotalLabel: string;
  totalLabel: string;
  footerNote?: string;
  primaryColor?: string;
}

const FONT = '"Segoe UI", Tahoma, Arial, sans-serif';

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + '…').width > maxWidth) {
    t = t.slice(0, -1);
  }
  return t + '…';
}

function money(n: number, currency: string): string {
  return `${n.toFixed(2)} ${currency}`;
}

export function buildInvoiceImage(o: InvoiceOptions): Promise<string> {
  return new Promise((resolve) => {
    const W = 620;
    const PAD = 36;
    const headerH = 104;
    const infoLines = (o.customerName ? 1 : 0) + (o.customerPhone ? 1 : 0);
    const itemsH = o.items.length === 0 ? 40 : o.items.length * 66;
    const H =
      headerH + // header
      42 + // space after header
      30 + // pharmacy name
      24 + // date
      infoLines * 20 + // customer name / phone
      10 + // gap before divider
      24 + // divider + gap
      itemsH + // items
      8 + // gap before divider
      28 + // divider + gap
      30 + // subtotal
      40 + // total
      40; // bottom padding (footer note + margin)

    const canvas = document.createElement('canvas');
    canvas.width = W * 2;
    canvas.height = H * 2;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      resolve('');
      return;
    }
    ctx.scale(2, 2);
    try {
      ctx.direction = 'rtl';
    } catch {
      // some browsers don't support canvas direction
    }
    ctx.textBaseline = 'alphabetic';
    const primary = o.primaryColor || '#0d9488';

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);

    // header
    ctx.fillStyle = primary;
    ctx.fillRect(0, 0, W, headerH);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.font = `bold 26px ${FONT}`;
    ctx.fillText(o.siteName, W / 2, 48);
    ctx.font = `13px ${FONT}`;
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.fillText(o.title, W / 2, 78);

    let y = headerH + 42;

    // pharmacy
    ctx.textAlign = 'right';
    ctx.fillStyle = '#111827';
    ctx.font = `bold 20px ${FONT}`;
    ctx.fillText(fitText(ctx, o.pharmacyName, W - PAD * 2), W - PAD, y);
    y += 30;
    ctx.font = `12px ${FONT}`;
    ctx.fillStyle = '#6b7280';
    ctx.fillText(o.dateLabel, W - PAD, y);
    y += 24;
    if (o.customerName) {
      ctx.fillText(`${o.customerLabel}: ${o.customerName}`, W - PAD, y);
      y += 20;
    }
    if (o.customerPhone) {
      ctx.fillText(`${o.customerPhone}`, W - PAD, y);
      y += 20;
    }
    y += 10;
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PAD, y);
    ctx.lineTo(W - PAD, y);
    ctx.stroke();
    y += 24;

    // items
    if (o.items.length === 0) {
      ctx.fillStyle = '#9ca3af';
      ctx.font = `13px ${FONT}`;
      ctx.textAlign = 'right';
      ctx.fillText('—', W - PAD, y);
      y += 40;
    } else {
      o.items.forEach((it) => {
        ctx.fillStyle = '#111827';
        ctx.textAlign = 'right';
        ctx.font = `bold 14px ${FONT}`;
        const maxNameW = W - PAD * 2 - 170;
        ctx.fillText(fitText(ctx, it.name, maxNameW), W - PAD, y);
        ctx.textAlign = 'left';
        ctx.font = `bold 14px ${FONT}`;
        ctx.fillText(money(it.lineTotal, o.currency), PAD, y);
        ctx.textAlign = 'right';
        ctx.font = `11px ${FONT}`;
        ctx.fillStyle = '#6b7280';
        ctx.fillText(`${it.quantity} × ${money(it.unitPrice, o.currency)}`, W - PAD, y + 19);
        y += 66;
      });
    }

    y += 8;
    ctx.strokeStyle = '#e5e7eb';
    ctx.beginPath();
    ctx.moveTo(PAD, y);
    ctx.lineTo(W - PAD, y);
    ctx.stroke();
    y += 28;

    // subtotal
    ctx.textAlign = 'right';
    ctx.font = `13px ${FONT}`;
    ctx.fillStyle = '#6b7280';
    ctx.fillText(o.subtotalLabel, W - PAD, y);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#374151';
    ctx.fillText(money(o.subtotal, o.currency), PAD, y);
    y += 30;

    // total
    ctx.textAlign = 'right';
    ctx.font = `bold 18px ${FONT}`;
    ctx.fillStyle = '#111827';
    ctx.fillText(o.totalLabel, W - PAD, y);
    ctx.textAlign = 'left';
    ctx.fillStyle = primary;
    ctx.font = `bold 22px ${FONT}`;
    ctx.fillText(money(o.total, o.currency), PAD, y);
    y += 40;

    if (o.footerNote) {
      ctx.textAlign = 'center';
      ctx.font = `11px ${FONT}`;
      ctx.fillStyle = '#9ca3af';
      ctx.fillText(fitText(ctx, o.footerNote, W - PAD * 2), W / 2, H - 26);
    }

    resolve(canvas.toDataURL('image/png'));
  });
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [head, b64] = dataUrl.split(',');
  const mime = head.match(/:(.*?);/)?.[1] || 'image/png';
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}
