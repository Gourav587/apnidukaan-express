import { BillItem } from "./types";
import { format } from "date-fns";

// ─── Thermal Receipt Generator (58mm) ──────────────────────────
export function generateThermalReceiptHTML(order: any) {
  const items = (order.items as BillItem[]) || [];
  const date = format(new Date(order.created_at), "dd/MM/yy hh:mm a");
  const invoiceId = order.id.slice(0, 8).toUpperCase();
  const discount = Number(order.discount) || 0;
  const tax = Number(order.tax) || 0;
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);

  return `
<!DOCTYPE html>
<html><head><meta charset="utf-8">
<title>Receipt #${invoiceId}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Courier New', monospace; width: 58mm; padding: 4mm; font-size: 11px; color: #000; }
  .center { text-align: center; }
  .bold { font-weight: bold; }
  .line { border-top: 1px dashed #000; margin: 4px 0; }
  .row { display: flex; justify-content: space-between; }
  .items { width: 100%; }
  .item-name { font-size: 10px; }
  .item-detail { display: flex; justify-content: space-between; font-size: 10px; color: #444; padding-left: 8px; }
  .total-row { display: flex; justify-content: space-between; font-weight: bold; font-size: 13px; margin-top: 4px; }
  .footer { text-align: center; font-size: 9px; color: #666; margin-top: 8px; }
  @media print { 
    @page { size: 58mm auto; margin: 0; }
    body { width: 58mm; }
  }
</style>
</head><body>
  <div class="center bold" style="font-size:14px;">ApniDukaan</div>
  <div class="center" style="font-size:9px;color:#666;">Your Neighbourhood Store</div>
  <div class="line"></div>
  <div class="row"><span>Bill: #${invoiceId}</span><span>${date}</span></div>
  ${order.customer_name && order.customer_name !== "Walk-in Customer" ? `<div style="font-size:10px;">Customer: ${order.customer_name}</div>` : ""}
  ${order.phone ? `<div style="font-size:10px;">Ph: ${order.phone}</div>` : ""}
  <div class="line"></div>
  <div class="items">
    ${items.map((item) => `
      <div class="item-name">${item.name}</div>
      <div class="item-detail">
        <span>${item.quantity} × ₹${item.price}</span>
        <span>₹${(item.price * item.quantity).toFixed(2)}</span>
      </div>
    `).join("")}
  </div>
  <div class="line"></div>
  <div class="row" style="font-size:10px;"><span>Subtotal</span><span>₹${subtotal.toFixed(2)}</span></div>
  ${discount > 0 ? `<div class="row" style="font-size:10px;"><span>Discount</span><span>-₹${discount.toFixed(2)}</span></div>` : ""}
  ${tax > 0 ? `<div class="row" style="font-size:10px;"><span>Tax</span><span>+₹${tax.toFixed(2)}</span></div>` : ""}
  <div class="line"></div>
  <div class="total-row"><span>TOTAL</span><span>₹${order.total}</span></div>
  <div style="font-size:10px;text-align:center;margin-top:2px;">Paid via: ${(order.payment_method || "cash").toUpperCase()}</div>
  <div class="line"></div>
  <div class="footer">
    <p>Thank you! Visit again.</p>
    <p>*** No Exchange / No Refund ***</p>
  </div>
</body></html>`;
}

export function printThermalReceipt(order: any) {
  const html = generateThermalReceiptHTML(order);
  const printWindow = window.open("", "_blank", "width=250,height=600");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 300);
  }
}

// ─── WhatsApp Invoice Share ────────────────────────────────────
export function shareOnWhatsApp(order: any) {
  const items = (order.items as BillItem[]) || [];
  const invoiceId = order.id.slice(0, 8).toUpperCase();
  const date = format(new Date(order.created_at), "dd MMM yyyy, hh:mm a");
  const discount = Number(order.discount) || 0;
  const tax = Number(order.tax) || 0;

  let msg = `🧾 *ApniDukaan Invoice #${invoiceId}*\n`;
  msg += `📅 ${date}\n`;
  if (order.customer_name) msg += `👤 ${order.customer_name}\n`;
  msg += `─────────────────\n`;
  items.forEach((item, i) => {
    msg += `${i + 1}. ${item.name}\n   ${item.quantity} × ₹${item.price} = ₹${(item.price * item.quantity).toFixed(2)}\n`;
  });
  msg += `─────────────────\n`;
  if (discount > 0) msg += `Discount: -₹${discount.toFixed(2)}\n`;
  if (tax > 0) msg += `Tax: +₹${tax.toFixed(2)}\n`;
  msg += `*Total: ₹${order.total}*\n`;
  msg += `💳 Paid via: ${(order.payment_method || "cash").toUpperCase()}\n\n`;
  msg += `Thank you for shopping with ApniDukaan! 🙏`;

  const phone = order.phone?.replace(/\D/g, "") || "";
  const url = phone
    ? `https://wa.me/91${phone}?text=${encodeURIComponent(msg)}`
    : `https://wa.me/?text=${encodeURIComponent(msg)}`;
  window.open(url, "_blank");
}
