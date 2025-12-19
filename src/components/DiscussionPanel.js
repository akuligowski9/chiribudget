"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getDemoMode } from "@/lib/auth";
import Toast from "./Toast";
import { toastId } from "@/lib/format";

export default function DiscussionPanel({ month, currency }) {
  const [demoMode, setDemoMode] = useState(false);
  const [toast, setToast] = useState(null);

  const [householdId, setHouseholdId] = useState(null);
  const [userId, setUserId] = useState(null);

  const [statusRow, setStatusRow] = useState(null);
  const [notes, setNotes] = useState("");

  const [unresolvedFlagged, setUnresolvedFlagged] = useState(0);

  useEffect(() => {
    setDemoMode(getDemoMode());
    (async () => {
      if (getDemoMode()) {
        setStatusRow({ status: "draft", discussed_at: null });
        setNotes("");
        setUnresolvedFlagged(1); // demo shows block behavior
        return;
      }

      const { data } = await supabase.auth.getUser();
      const user = data?.user;
      setUserId(user?.id || null);
      if (!user) return;

      const { data: p } = await supabase.from("profiles").select("household_id").eq("user_id", user.id).maybeSingle();
      if (!p?.household_id) return;
      setHouseholdId(p.household_id);

      const { data: ms } = await supabase
        .from("month_status")
        .select("*")
        .eq("household_id", p.household_id)
        .eq("month", month)
        .eq("currency", currency)
        .maybeSingle();

      if (ms) {
        setStatusRow(ms);
        setNotes(ms.discussion_notes || "");
      } else {
        setStatusRow({ status: "draft", discussed_at: null, discussion_notes: "" });
      }

      const { data: flagged } = await supabase
        .from("transactions")
        .select("id,explanation")
        .eq("household_id", p.household_id)
        .eq("currency", currency)
        .gte("txn_date", `${month}-01`)
        .lt("txn_date", `${month}-31`)
        .eq("is_flagged", true);

      const unresolved = (flagged || []).filter(r => !(r.explanation && r.explanation.trim().length > 0)).length;
      setUnresolvedFlagged(unresolved);
    })();
  }, [month, currency]);

  async function saveNotes() {
    if (demoMode) {
      setToast({ id: toastId(), type: "success", title: "Saved (demo) ✅" });
      return;
    }
    if (!householdId) return;

    const payload = {
      household_id: householdId,
      month,
      currency,
      discussion_notes: notes,
      status: statusRow?.status || "draft"
    };

    const { error } = await supabase.from("month_status").upsert(payload, { onConflict: "household_id,month,currency" });
    if (error) setToast({ id: toastId(), type: "error", title: "Save failed", message: error.message });
    else setToast({ id: toastId(), type: "success", title: "Saved ✅" });
  }

  async function markDiscussed() {
    if (demoMode) {
      setToast({ id: toastId(), type: "error", title: "Demo mode", message: "Discussion tracking is disabled in demo." });
      return;
    }
    if (unresolvedFlagged > 0) {
      setToast({ id: toastId(), type: "error", title: "Blocked", message: "Resolve flagged explanations before marking Discussed." });
      return;
    }

    const payload = {
      household_id: householdId,
      month,
      currency,
      status: "discussed",
      discussion_notes: notes,
      discussed_at: new Date().toISOString(),
      discussed_by: userId
    };

    const { error } = await supabase.from("month_status").upsert(payload, { onConflict: "household_id,month,currency" });
    if (error) {
      setToast({ id: toastId(), type: "error", title: "Failed", message: error.message });
      return;
    }
    setStatusRow({ ...statusRow, status: "discussed", discussed_at: payload.discussed_at });
    setToast({ id: toastId(), type: "success", title: "Marked Discussed ✅" });
  }

  return (
    <section style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 }}>
      <h2 style={{ marginTop: 0 }}>Discussion</h2>
      <div style={{ opacity: 0.8 }}>
        Status: <b>{statusRow?.status || "draft"}</b>
        {statusRow?.discussed_at ? <> • Discussed on <b>{new Date(statusRow.discussed_at).toLocaleString()}</b></> : null}
      </div>

      <div style={{ marginTop: 8, opacity: 0.9 }}>
        Flagged items unresolved: <b>{unresolvedFlagged}</b>
      </div>

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="What we agreed / next month focus..."
        style={{ width: "100%", minHeight: 110, padding: 10, marginTop: 10 }}
      />

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
        <button onClick={saveNotes} style={{ padding: "10px 12px" }}>Save Notes</button>
        <button onClick={markDiscussed} style={{ padding: "10px 12px", fontWeight: 700 }}>
          Mark Discussed
        </button>
      </div>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </section>
  );
}
