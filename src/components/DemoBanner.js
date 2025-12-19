"use client";
import { useEffect, useState } from "react";
import { getDemoMode } from "@/lib/auth";

export default function DemoBanner() {
  const [demoMode, setDemoMode] = useState(false);
  useEffect(() => setDemoMode(getDemoMode()), []);
  if (!demoMode) return null;

  return (
    <div style={{ marginTop: 12, padding: 12, borderRadius: 10, background: "#fff7ed", border: "1px solid #fdba74" }}>
      <strong>Demo Mode:</strong> sample data only. No login required. Changes are not saved.
    </div>
  );
}
