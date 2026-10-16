"use client";

import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useAnalysts } from "@/hooks/useApi";
import AvatarList from "@/components/ui/AvatarList";
import ErrorState from "@/components/ui/ErrorState";
import GlassForm from "@/components/ui/GlassForm";
import { Input } from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Loader from "@/components/ui/Loader";
import TextReveal from "@/components/ui/TextReveal";
import { useStoredValue, writeStoredValue } from "@/hooks/useStoredValue";
import type { Analyst } from "@/lib/types";

export default function SettingsPage() {
  const { data: analysts, isLoading: analystsLoading, isError: analystsError, refetch: refetchAnalysts } = useAnalysts();
  const storedApiBase = useStoredValue("tracer.apiBase", process.env.NEXT_PUBLIC_API_BASE ?? "");
  const storedThreshold = useStoredValue("tracer.riskThreshold", "70");
  const storedWebhook = useStoredValue("tracer.webhookUrl", "");
  const storedInvited = useStoredValue("tracer.invitedAnalysts", "");
  const [apiBaseDraft, setApiBaseDraft] = useState<string | null>(null);
  const [thresholdDraft, setThresholdDraft] = useState<string | null>(null);
  const [webhookDraft, setWebhookDraft] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [testingWebhook, setTestingWebhook] = useState(false);
  const apiBase = apiBaseDraft ?? storedApiBase;
  const threshold = thresholdDraft ?? storedThreshold;
  const webhook = webhookDraft ?? storedWebhook;
  const localAnalysts = useMemo<Analyst[]>(() => {
    if (!storedInvited) return [];
    try {
      const parsed = JSON.parse(storedInvited);
      return Array.isArray(parsed) ? (parsed as Analyst[]) : [];
    } catch {
      return [];
    }
  }, [storedInvited]);

  function onSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const base = apiBase.trim();
    const thr = threshold.trim();
    const hook = webhook.trim();
    if (thr) {
      const n = Number(thr);
      if (Number.isNaN(n) || n < 0 || n > 100) {
        toast.error("Invalid threshold", { description: "Threshold must be 0-100" });
        return;
      }
      writeStoredValue("tracer.riskThreshold", String(n));
    }
    writeStoredValue("tracer.apiBase", base || null);
    writeStoredValue("tracer.webhookUrl", hook || null);
    toast.success("Settings saved", { description: `API: ${base || "default"} · Threshold: ${thr} · Webhook: ${hook ? "set" : "none"}` });
    setApiBaseDraft(null);
    setThresholdDraft(null);
    setWebhookDraft(null);
  }

  async function testWebhook() {
    const url = webhook.trim();
    if (!url) { toast.error("Enter a webhook URL first"); return; }
    try { new URL(url); } catch { toast.error("Invalid URL", { description: "Must be https://..." }); return; }
    setTestingWebhook(true);
    try {
      // Best-effort test ping (no-cors to avoid CORS blocking in demo)
      await fetch(url, { method: "POST", mode: "no-cors", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ event: "tracer.test", ts: Date.now(), threshold }) });
      toast.success("Webhook test sent", { description: `POST to ${url} (no-cors)` });
    } catch (err) {
      toast.error("Webhook test failed", { description: String(err) });
    } finally {
      setTestingWebhook(false);
    }
  }

  function handleInvite() {
    const email = inviteEmail.trim();
    if (!email) { toast.error("Enter an email"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast.error("Invalid email"); return; }
    const name = email.split("@")[0].split(".").map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
    const newAnalyst: Analyst = { id: `inv_${Date.now()}`, name: name || email, role: "Invited Analyst", status: "online" };
    const updated = [...localAnalysts, newAnalyst];
    writeStoredValue("tracer.invitedAnalysts", JSON.stringify(updated));
    setInviteEmail("");
    toast.success("Analyst invited", { description: `${email} added to roster` });
  }

  const allAnalysts = [...(analysts ?? []), ...localAnalysts];

  return (
    <div className="flex flex-col gap-6">
      <TextReveal as="h1" text="Settings" by="char" className="font-sans text-3xl font-bold text-text-primary" />
      <p className="text-sm text-text-secondary">Engine connection, thresholds and response team — all live and synced.</p>

      <div className="grid gap-6 lg:grid-cols-2">
        <GlassForm title="Engine configuration" description="Connection and alerting thresholds. Saved to localStorage and applied instantly." onSubmit={onSave} submitLabel="Save settings">
          <Input label="API base URL" name="apiBase" placeholder="http://127.0.0.1:8000" value={apiBase} onChange={(e) => setApiBaseDraft(e.target.value)} hint="Saved as tracer.apiBase · used by all API calls" />
          <Input label="Alert risk threshold" name="threshold" type="number" placeholder="70" value={threshold} onChange={(e) => setThresholdDraft(e.target.value)} min={0} max={100} hint={`HIGH if risk_score ≥ ${threshold} · synced to Overview/Ledger live filters`} />
          <div className="flex flex-col gap-1.5">
            <Input label="Webhook URL" name="webhook" placeholder="https://hooks.razorpay.com/..." value={webhook} onChange={(e) => setWebhookDraft(e.target.value)} hint="POST on HIGH alerts · saved as tracer.webhookUrl" />
            <Button type="button" variant="ghost" onClick={testWebhook} disabled={testingWebhook} className="self-start">
              {testingWebhook ? "Testing..." : "Test webhook"}
            </Button>
          </div>
        </GlassForm>

        <div className="glass flex flex-col gap-4 p-6">
          <h3 className="font-sans text-lg font-bold text-text-primary">Response team</h3>
          <p className="text-sm text-text-secondary">Analysts rostered on the TRACER watch — invite adds instantly and persists locally.</p>
          {analystsError ? (
            <ErrorState title="Couldn't load analysts" message="Roster unreachable" onRetry={() => refetchAnalysts()} />
          ) : analystsLoading ? (
            <Loader size="sm" label="loading analysts…" />
          ) : (
            <AvatarList analysts={allAnalysts ?? []} className="flex-wrap" />
          )}
          <div className="mt-auto flex flex-col gap-2">
            <Input label="Invite analyst" placeholder="name@razorpay.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} hint={`Roster: ${allAnalysts.length} analysts · stored in tracer.invitedAnalysts`} />
            <Button type="button" onClick={handleInvite} variant="secondary" className="self-start">Invite Analyst</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
