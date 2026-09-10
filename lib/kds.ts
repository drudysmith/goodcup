export const KDS_STATUSES = ['new', 'making', 'ready', 'done'] as const;

export type KdsStatus = typeof KDS_STATUSES[number];

export type KdsItem = {
  productId: string;
  priceId: string;
  name: string;
  quantity: number;
};

export type KdsOrder = {
  id: string;
  stripePaymentIntentId: string;
  status: KdsStatus;
  currency: string;
  totalAmount: number;
  itemCount: number;
  items: KdsItem[];
  createdAt: string;
  paidAt: string;
  statusUpdatedAt: string;
};

export const isKdsStatus = (value: unknown): value is KdsStatus =>
  typeof value === 'string' && (KDS_STATUSES as readonly string[]).includes(value);

export const kdsStatusLabel = (status: KdsStatus) => ({
  new: 'New',
  making: 'Making',
  ready: 'Ready',
  done: 'Done',
}[status]);
