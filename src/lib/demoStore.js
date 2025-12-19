import demoTxns from "../../demo/transactions.json";

export function getDemoTransactions({ month, currency }) {
  return (demoTxns || []).filter(t => (t.txn_date || "").startsWith(month) && t.currency === currency);
}
