export type PaymentStatus = "payment_pending" | "payment_review" | "active" | "rejected";

export interface PaymentRequest {
  id: string;
  orderNumber: string;
  customerName: string;
  phone: string;
  plan: string;
  amount: number;
  payerName: string;
  receiptName: string;
  status: PaymentStatus;
  activationCode?: string;
  createdAt: string;
}

const KEY = "vizora.payment-requests.v1";

const read = (): PaymentRequest[] => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as PaymentRequest[];
  } catch {
    return [];
  }
};

const write = (items: PaymentRequest[]) =>
  localStorage.setItem(KEY, JSON.stringify(items));

const randomCode = () =>
  `VZ-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase()}`;

export const paymentRepository = {
  list: () => read().sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  create: (data: Omit<PaymentRequest, "id" | "orderNumber" | "status" | "createdAt">) => {
    const item: PaymentRequest = {
      ...data,
      id: crypto.randomUUID(),
      orderNumber: `VZ-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
      status: "payment_review",
      createdAt: new Date().toISOString()
    };
    write([item, ...read()]);
    return item;
  },
  approve: (id: string) => {
    const code = randomCode();
    write(read().map((item) =>
      item.id === id ? { ...item, status: "active", activationCode: code } : item
    ));
    return code;
  },
  reject: (id: string) =>
    write(read().map((item) =>
      item.id === id ? { ...item, status: "rejected" } : item
    ))
};
