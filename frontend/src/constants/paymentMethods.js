export const PAYMENT_METHODS = [
  {
    value: 'cash_on_delivery',
    label: 'Cash on Delivery',
    description: 'Pay when your order arrives.',
  },
  {
    value: 'telebirr',
    label: 'Telebirr',
    description: 'Pay using Telebirr.',
  },
  {
    value: 'cbe',
    label: 'CBE Birr / CBE payment',
    description: 'Pay using a supported CBE service.',
  },
  {
    value: 'card',
    label: 'Bank Card',
    description: 'Pay by card if supported.',
  },
];

const paymentMethodLabels = new Map(
  PAYMENT_METHODS.map(({ value, label }) => [value, label])
);

paymentMethodLabels.set('Cash on Delivery', 'Cash on Delivery');
paymentMethodLabels.set('Credit Card', 'Bank Card');

export const getPaymentMethodLabel = (value) => (
  paymentMethodLabels.get(value)
  || (typeof value === 'string' && value.trim() ? value : 'Not selected')
);
