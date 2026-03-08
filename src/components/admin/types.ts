export interface BillItem {
  name: string;
  price: number;
  quantity: number;
  unit: string;
}

export type PaymentMethod = "cash" | "upi" | "card" | "online" | "credit";
