// Client-side GST Invoice PDF generator using browser print
export interface InvoicePDFData {
  invoice: {
    invoice_number: string;
    invoice_date: string;
    due_date?: string | null;
    customer_name?: string | null;
    customer_phone?: string | null;
    customer_address?: string | null;
    customer_gstin?: string | null;
    subtotal: number;
    discount: number;
    taxable_amount: number;
    cgst_total: number;
    sgst_total: number;
    igst_total: number;
    total: number;
    amount_paid: number;
    balance_due: number;
    payment_status: string;
    notes?: string | null;
  };
  items: {
    description: string;
    hsn_code?: string | null;
    quantity: number;
    unit: string;
    unit_price: number;
    discount: number;
    taxable_amount: number;
    gst_rate: number;
    cgst: number;
    sgst: number;
    total: number;
  }[];
  storeName?: string;
  storeAddress?: string;
  storePhone?: string;
  storeGstin?: string;
}

function numberToWords(num: number): string {
  if (num === 0) return "Zero";
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const convert = (n: number): string => {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
    if (n < 1000) return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + convert(n % 100) : "");
    if (n < 100000) return convert(Math.floor(n / 1000)) + " Thousand" + (n % 1000 ? " " + convert(n % 1000) : "");
    if (n < 10000000) return convert(Math.floor(n / 100000)) + " Lakh" + (n % 100000 ? " " + convert(n % 100000) : "");
    return convert(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 ? " " + convert(n % 10000000) : "");
  };

  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);
  let result = convert(rupees) + " Rupees";
  if (paise > 0) result += " and " + convert(paise) + " Paise";
  return result + " Only";
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatCurrency(n: number): string {
  return "₹" + Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function generateInvoiceHTML(data: InvoicePDFData): string {
  const { invoice: inv, items, storeName = "My Store", storeAddress = "", storePhone = "", storeGstin = "" } = data;

  const itemRows = items.map((item, i) => `
    <tr>
      <td style="padding:6px 8px;border:1px solid #ddd;text-align:center">${i + 1}</td>
      <td style="padding:6px 8px;border:1px solid #ddd">${item.description}</td>
      <td style="padding:6px 8px;border:1px solid #ddd;text-align:center">${item.hsn_code || "-"}</td>
      <td style="padding:6px 8px;border:1px solid #ddd;text-align:center">${item.quantity} ${item.unit}</td>
      <td style="padding:6px 8px;border:1px solid #ddd;text-align:right">${formatCurrency(item.unit_price)}</td>
      <td style="padding:6px 8px;border:1px solid #ddd;text-align:right">${item.discount > 0 ? formatCurrency(item.discount) : "-"}</td>
      <td style="padding:6px 8px;border:1px solid #ddd;text-align:right">${formatCurrency(item.taxable_amount)}</td>
      <td style="padding:6px 8px;border:1px solid #ddd;text-align:center">${item.gst_rate}%</td>
      <td style="padding:6px 8px;border:1px solid #ddd;text-align:right">${formatCurrency(item.cgst)}</td>
      <td style="padding:6px 8px;border:1px solid #ddd;text-align:right">${formatCurrency(item.sgst)}</td>
      <td style="padding:6px 8px;border:1px solid #ddd;text-align:right;font-weight:600">${formatCurrency(item.total)}</td>
    </tr>
  `).join("");

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Invoice ${inv.invoice_number}</title>
<style>
  @media print { body { margin: 0; } @page { size: A4; margin: 12mm; } }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #333; line-height: 1.4; }
  table { border-collapse: collapse; width: 100%; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 3px solid #2563eb; }
  .title { font-size: 22px; font-weight: 700; color: #2563eb; }
  .badge { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 10px; font-weight: 600; text-transform: uppercase; }
  .badge-paid { background: #dcfce7; color: #166534; }
  .badge-unpaid { background: #fef2f2; color: #991b1b; }
  .badge-partial { background: #fef9c3; color: #854d0e; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
  .info-box { padding: 10px; border-radius: 6px; background: #f8fafc; }
  .info-box h4 { font-size: 10px; text-transform: uppercase; color: #64748b; margin-bottom: 4px; letter-spacing: 0.5px; }
  .totals { margin-left: auto; width: 280px; }
  .totals tr td { padding: 4px 8px; }
  .totals .grand { font-size: 14px; font-weight: 700; border-top: 2px solid #333; }
  .words { margin-top: 12px; padding: 8px 12px; background: #f1f5f9; border-radius: 6px; font-style: italic; font-size: 11px; }
  .footer { margin-top: 40px; display: flex; justify-content: space-between; align-items: flex-end; }
  .sig-box { text-align: center; width: 180px; }
  .sig-line { border-top: 1px solid #999; margin-top: 50px; padding-top: 4px; font-size: 11px; color: #666; }
</style></head><body>
  <div class="header">
    <div>
      <div class="title">${storeName}</div>
      ${storeAddress ? `<div style="font-size:11px;color:#666;margin-top:2px">${storeAddress}</div>` : ""}
      ${storePhone ? `<div style="font-size:11px;color:#666">Phone: ${storePhone}</div>` : ""}
      ${storeGstin ? `<div style="font-size:11px;color:#666">GSTIN: ${storeGstin}</div>` : ""}
    </div>
    <div style="text-align:right">
      <div style="font-size:18px;font-weight:700">TAX INVOICE</div>
      <div style="font-size:13px;font-weight:600;margin-top:4px">${inv.invoice_number}</div>
      <div style="font-size:11px;color:#666;margin-top:2px">Date: ${formatDate(inv.invoice_date)}</div>
      ${inv.due_date ? `<div style="font-size:11px;color:#666">Due: ${formatDate(inv.due_date)}</div>` : ""}
      <span class="badge badge-${inv.payment_status}">${inv.payment_status}</span>
    </div>
  </div>

  <div class="info-grid">
    <div class="info-box">
      <h4>Bill To</h4>
      <div style="font-weight:600">${inv.customer_name || "Walk-in Customer"}</div>
      ${inv.customer_phone ? `<div>Phone: ${inv.customer_phone}</div>` : ""}
      ${inv.customer_address ? `<div>${inv.customer_address}</div>` : ""}
      ${inv.customer_gstin ? `<div>GSTIN: ${inv.customer_gstin}</div>` : ""}
    </div>
    <div class="info-box">
      <h4>Invoice Details</h4>
      <div>Invoice #: <strong>${inv.invoice_number}</strong></div>
      <div>Date: ${formatDate(inv.invoice_date)}</div>
      ${inv.due_date ? `<div>Due Date: ${formatDate(inv.due_date)}</div>` : ""}
    </div>
  </div>

  <table style="margin-bottom:16px">
    <thead>
      <tr style="background:#2563eb;color:#fff">
        <th style="padding:8px;border:1px solid #2563eb;width:30px">#</th>
        <th style="padding:8px;border:1px solid #2563eb;text-align:left">Description</th>
        <th style="padding:8px;border:1px solid #2563eb">HSN</th>
        <th style="padding:8px;border:1px solid #2563eb">Qty</th>
        <th style="padding:8px;border:1px solid #2563eb;text-align:right">Rate</th>
        <th style="padding:8px;border:1px solid #2563eb;text-align:right">Disc</th>
        <th style="padding:8px;border:1px solid #2563eb;text-align:right">Taxable</th>
        <th style="padding:8px;border:1px solid #2563eb">GST%</th>
        <th style="padding:8px;border:1px solid #2563eb;text-align:right">CGST</th>
        <th style="padding:8px;border:1px solid #2563eb;text-align:right">SGST</th>
        <th style="padding:8px;border:1px solid #2563eb;text-align:right">Total</th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>

  <div style="display:flex;justify-content:flex-end">
    <table class="totals">
      <tr><td style="color:#666">Subtotal</td><td style="text-align:right">${formatCurrency(inv.subtotal)}</td></tr>
      ${Number(inv.discount) > 0 ? `<tr><td style="color:#666">Discount</td><td style="text-align:right;color:#dc2626">-${formatCurrency(inv.discount)}</td></tr>` : ""}
      <tr><td style="color:#666">Taxable Amount</td><td style="text-align:right">${formatCurrency(inv.taxable_amount)}</td></tr>
      <tr><td style="color:#666">CGST</td><td style="text-align:right">${formatCurrency(inv.cgst_total)}</td></tr>
      <tr><td style="color:#666">SGST</td><td style="text-align:right">${formatCurrency(inv.sgst_total)}</td></tr>
      ${Number(inv.igst_total) > 0 ? `<tr><td style="color:#666">IGST</td><td style="text-align:right">${formatCurrency(inv.igst_total)}</td></tr>` : ""}
      <tr class="grand"><td>Grand Total</td><td style="text-align:right;color:#2563eb">${formatCurrency(inv.total)}</td></tr>
      <tr><td style="color:#16a34a">Amount Paid</td><td style="text-align:right;color:#16a34a">${formatCurrency(inv.amount_paid)}</td></tr>
      ${Number(inv.balance_due) > 0 ? `<tr><td style="color:#dc2626;font-weight:600">Balance Due</td><td style="text-align:right;color:#dc2626;font-weight:600">${formatCurrency(inv.balance_due)}</td></tr>` : ""}
    </table>
  </div>

  <div class="words"><strong>Amount in words:</strong> ${numberToWords(Number(inv.total))}</div>

  ${inv.notes ? `<div style="margin-top:12px;padding:8px;background:#f8fafc;border-radius:6px;font-size:11px"><strong>Notes:</strong> ${inv.notes}</div>` : ""}

  <div class="footer">
    <div style="font-size:10px;color:#999">This is a computer-generated invoice.</div>
    <div class="sig-box">
      <div class="sig-line">Authorized Signatory</div>
    </div>
  </div>
</body></html>`;
}

export function downloadInvoicePDF(data: InvoicePDFData) {
  const html = generateInvoiceHTML(data);
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    // Fallback: create iframe
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
      setTimeout(() => {
        iframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(iframe), 1000);
      }, 500);
    }
    return;
  }
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  setTimeout(() => printWindow.print(), 500);
}
