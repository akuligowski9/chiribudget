"use client";

import { useState } from "react";
import DashboardCharts from "@/components/DashboardCharts";
import FlaggedReview from "@/components/FlaggedReview";
import DiscussionPanel from "@/components/DiscussionPanel";
import { CURRENCIES } from "@/lib/categories";

export default function DashboardPage() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [currency, setCurrency] = useState("USD");

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: 16 }}>
      <h1 style={{ marginTop: 0 }}>Dashboard</h1>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <label>
          Month&nbsp;
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        </label>

        <label>
          Currency&nbsp;
          <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>

        <a href="/" style={{ marginLeft: "auto" }}>← Back Home</a>
      </div>

      <div style={{ marginTop: 14 }}>
        <DashboardCharts month={month} currency={currency} />
      </div>

      {/* Discussion workflow UNDER the visuals, as requested */}
      <div style={{ marginTop: 14 }}>
        <FlaggedReview month={month} currency={currency} />
      </div>

      <div style={{ marginTop: 14 }}>
        <DiscussionPanel month={month} currency={currency} />
      </div>
    </main>
  );
}
