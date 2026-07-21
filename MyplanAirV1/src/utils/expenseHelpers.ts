// src/utils/expenseHelpers.ts
// ═══════════════════════════════════════════════════════════════════════════════
// Helpers dépenses — calculs cohérents entre Budget, Overview et Dashboard.
// `amount` = montant réellement payé/saisi.
// `amountHome` = montant converti dans la devise de budget du voyage.
// ═══════════════════════════════════════════════════════════════════════════════

import type { Expense } from '../store/types';

export const getExpenseBudgetAmount = (expense: Expense, budgetCurrency: string): number => {
  const paidAmount = Number(expense.amount);
  const convertedAmount = Number(expense.amountHome);

  if (
    expense.currency &&
    expense.currency !== budgetCurrency &&
    Number.isFinite(convertedAmount) &&
    convertedAmount > 0
  ) {
    return convertedAmount;
  }

  return Number.isFinite(paidAmount) ? paidAmount : 0;
};

export const isMultiCurrencyExpense = (expense: Expense, budgetCurrency: string): boolean =>
  Boolean(expense.currency) && expense.currency !== budgetCurrency;

export const getExpensesBudgetTotal = (
  expenses: Expense[] | undefined,
  budgetCurrency: string,
): number =>
  (expenses ?? []).reduce(
    (sum, expense) => sum + getExpenseBudgetAmount(expense, budgetCurrency),
    0,
  );
