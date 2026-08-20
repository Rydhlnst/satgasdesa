export const FINANCIAL_TRANSACTION_TYPES = ["CASH_IN", "CASH_OUT"] as const;
export const FINANCIAL_TRANSACTION_STATUSES = ["DRAFT", "SAH", "REVERSED"] as const;

export type FinancialTransactionType = (typeof FINANCIAL_TRANSACTION_TYPES)[number];
export type FinancialTransactionStatus = (typeof FINANCIAL_TRANSACTION_STATUSES)[number];
