export const fmtMoney = (amount: number, currency: string = 'EUR') => {
  try {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${Math.round(amount)} ${currency}`;
  }
};

export const fmtMoneyDecimal = (amount: number, currency: string = 'EUR') => {
  try {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
};
