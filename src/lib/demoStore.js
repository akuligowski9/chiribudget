import demoTxns from "../../demo/transactions.json";

export function getDemoTransactions({ month, currency }) {
  const prefix = month; // YYYY-MM
  return demoTxns.filter(t => t.txn_date.startsWith(prefix) && t.currency === currency);
}

export function demoToastSave() {
  return { ok: true, message: "Saved (demo) ✅" };
}
