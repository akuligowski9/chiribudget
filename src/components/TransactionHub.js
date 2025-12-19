"use client";
import { useState } from "react";
import QuickAddForm from "./QuickAddForm";
import ImportPanel from "./ImportPanel";
import ExportPanel from "./ExportPanel";

export default function TransactionHub() {
  const [tab, setTab] = useState("quick");

  return (
    <section style={{ marginTop: 14, border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 }}>
      <h2 style={{ marginTop: 0 }}>Transactions</h2>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button onClick={() => setTab("quick")} style={{ padding: "8px 10px" }}>Quick</button>
        <button onClick={() => setTab("import")} style={{ padding: "8px 10px" }}>Import</button>
        <button onClick={() => setTab("export")} style={{ padding: "8px 10px" }}>Export</button>
      </div>

      <div style={{ marginTop: 14 }}>
        {tab === "quick" && <QuickAddForm />}
        {tab === "import" && <ImportPanel />}
        {tab === "export" && <ExportPanel />}
      </div>
    </section>
  );
}
