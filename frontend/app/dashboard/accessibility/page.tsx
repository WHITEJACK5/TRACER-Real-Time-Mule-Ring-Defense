"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import TextReveal from "@/components/ui/TextReveal";
import { useStoredValue, writeStoredValue } from "@/hooks/useStoredValue";

function applyFontScale(v: string) {
  document.documentElement.style.fontSize = v === "100" ? "" : `${v}%`;
}
function applyHighContrast(on: boolean) {
  document.documentElement.classList.toggle("high-contrast", on);
  if (on) {
    document.documentElement.style.setProperty("--a11y-border-boost", "1");
  } else {
    document.documentElement.style.removeProperty("--a11y-border-boost");
  }
}
function applyReduceMotion(on: boolean) {
  if (on) {
    document.documentElement.classList.add("reduce-motion");
    document.documentElement.style.setProperty("--motion-duration", "0.01ms");
    const style = document.getElementById("a11y-reduce-motion") || document.createElement("style");
    style.id = "a11y-reduce-motion";
    style.textContent = `.reduce-motion *, .reduce-motion *::before, .reduce-motion *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; }`;
    if (!document.getElementById("a11y-reduce-motion")) document.head.appendChild(style);
  } else {
    document.documentElement.classList.remove("reduce-motion");
    document.documentElement.style.removeProperty("--motion-duration");
    const s = document.getElementById("a11y-reduce-motion");
    if (s) s.remove();
  }
}
function applyLargeClick(on: boolean) {
  document.documentElement.classList.toggle("large-click", on);
  const style = document.getElementById("a11y-large-click") || document.createElement("style");
  style.id = "a11y-large-click";
  style.textContent = `.large-click button, .large-click a, .large-click .chip { padding-block: 0.65rem !important; padding-inline: 1rem !important; } .large-click .h-9 { height: 2.5rem !important; width: 2.5rem !important; }`;
  if (on) {
    if (!document.getElementById("a11y-large-click")) document.head.appendChild(style);
  } else {
    const s = document.getElementById("a11y-large-click");
    if (s) s.remove();
  }
}

export default function AccessibilityPage() {
  const storedFontScale = useStoredValue("tracer.a11y.fontScale", "100");
  const storedHighContrast = useStoredValue("tracer.a11y.highContrast", "0");
  const storedReduceMotion = useStoredValue("tracer.a11y.reduceMotion", "0");
  const storedLargeClick = useStoredValue("tracer.a11y.largeClick", "0");
  const [fontScaleDraft, setFontScaleDraft] = useState<string | null>(null);
  const [highContrastDraft, setHighContrastDraft] = useState<boolean | null>(null);
  const [reduceMotionDraft, setReduceMotionDraft] = useState<boolean | null>(null);
  const [largeClickDraft, setLargeClickDraft] = useState<boolean | null>(null);
  const fontScale = fontScaleDraft ?? storedFontScale;
  const highContrast = highContrastDraft ?? storedHighContrast === "1";
  const reduceMotion = reduceMotionDraft ?? storedReduceMotion === "1";
  const largeClick = largeClickDraft ?? storedLargeClick === "1";

  // Live preview — applies the effective values whenever they change
  useEffect(() => { applyFontScale(fontScale); }, [fontScale]);
  useEffect(() => { applyHighContrast(highContrast); }, [highContrast]);
  useEffect(() => { applyReduceMotion(reduceMotion); }, [reduceMotion]);
  useEffect(() => { applyLargeClick(largeClick); }, [largeClick]);

  function save() {
    writeStoredValue("tracer.a11y.fontScale", fontScale);
    writeStoredValue("tracer.a11y.highContrast", highContrast ? "1" : "0");
    writeStoredValue("tracer.a11y.reduceMotion", reduceMotion ? "1" : "0");
    writeStoredValue("tracer.a11y.largeClick", largeClick ? "1" : "0");
    setFontScaleDraft(null); setHighContrastDraft(null); setReduceMotionDraft(null); setLargeClickDraft(null);
    toast.success("Accessibility saved", { description: `Font ${fontScale}% · ${highContrast ? "High contrast ON" : "High contrast OFF"} · ${reduceMotion ? "Motion reduced" : "Motion ON"} · ${largeClick ? "Large targets ON" : "Standard targets"}` });
  }

  function reset() {
    setFontScaleDraft(null); setHighContrastDraft(null); setReduceMotionDraft(null); setLargeClickDraft(null);
    writeStoredValue("tracer.a11y.fontScale", null);
    writeStoredValue("tracer.a11y.highContrast", null);
    writeStoredValue("tracer.a11y.reduceMotion", null);
    writeStoredValue("tracer.a11y.largeClick", null);
    toast.success("Accessibility reset", { description: "All preferences restored to defaults" });
  }

  return (
    <div className="flex flex-col gap-6">
      <TextReveal as="h1" text="Accessibility" by="char" className="font-sans text-3xl font-bold text-text-primary" />
      <p className="text-sm text-text-secondary">Tune TRACER for your needs — every control applies instantly and persists in localStorage. Changes sync across all pages.</p>

      <div className="glass flex flex-col gap-6 p-6">
        <div className="flex flex-col gap-2">
          <label className="font-mono text-xs font-semibold uppercase tracking-wider text-text-muted">Font scale — live preview as you drag</label>
          <div className="flex items-center gap-3">
            <input
              type="range" min={85} max={130} step={5} value={fontScale}
              onChange={(e) => setFontScaleDraft(e.target.value)}
              className="flex-1 accent-accent h-2 cursor-pointer appearance-none rounded-full bg-bg-tertiary"
            />
            <span className="w-14 rounded-md border border-border bg-bg-tertiary px-2 py-1.5 text-center font-mono text-sm font-bold text-accent">{fontScale}%</span>
          </div>
          <p className="font-mono text-[11px] text-text-muted">Try moving the slider — the entire UI scales instantly. Save to persist.</p>
          <div className="rounded-md border border-border bg-bg-primary/40 p-3">
            <p className="font-mono text-xs text-text-secondary" style={{ fontSize: `${fontScale}%` }}>Preview: The quick brown fox jumps over the lazy dog — TRACER risk console at {fontScale}% scale.</p>
          </div>
        </div>

        <label className="flex cursor-pointer items-center justify-between rounded-md border border-border bg-bg-primary/40 px-4 py-3 transition-colors hover:border-accent/50">
          <div><p className="font-mono text-sm font-medium text-text-primary">High contrast</p><p className="font-mono text-xs text-text-muted">Boost borders and text contrast for low-vision · {highContrast ? "ON" : "OFF"}</p></div>
          <input type="checkbox" checked={highContrast} onChange={(e) => setHighContrastDraft(e.target.checked)} className="h-5 w-5 accent-accent rounded" />
        </label>

        <label className="flex cursor-pointer items-center justify-between rounded-md border border-border bg-bg-primary/40 px-4 py-3 transition-colors hover:border-accent/50">
          <div><p className="font-mono text-sm font-medium text-text-primary">Reduce motion</p><p className="font-mono text-xs text-text-muted">Disable glow, pulse and slide animations · {reduceMotion ? "ON" : "OFF"}</p></div>
          <input type="checkbox" checked={reduceMotion} onChange={(e) => setReduceMotionDraft(e.target.checked)} className="h-5 w-5 accent-accent rounded" />
        </label>

        <label className="flex cursor-pointer items-center justify-between rounded-md border border-border bg-bg-primary/40 px-4 py-3 transition-colors hover:border-accent/50">
          <div><p className="font-mono text-sm font-medium text-text-primary">Large click targets</p><p className="font-mono text-xs text-text-muted">Increase button and chip padding for easier clicking · {largeClick ? "ON" : "OFF"}</p></div>
          <input type="checkbox" checked={largeClick} onChange={(e) => setLargeClickDraft(e.target.checked)} className="h-5 w-5 accent-accent rounded" />
        </label>

        <div className="flex gap-3 pt-2">
          <button onClick={save} className="rounded-md bg-accent px-6 py-2.5 font-mono text-sm font-semibold text-white shadow hover:bg-accent/90 transition-colors">Save preferences</button>
          <button onClick={reset} className="rounded-md border border-border bg-bg-tertiary px-6 py-2.5 font-mono text-sm font-medium text-text-secondary hover:bg-bg-tertiary/80 transition-colors">Reset to defaults</button>
        </div>
        <p className="font-mono text-[11px] text-text-muted">All settings are applied instantly as you toggle and persist via <span className="text-accent">tracer.a11y.*</span> in localStorage. No backend needed.</p>
      </div>
    </div>
  );
}
