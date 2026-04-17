"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  User, Palette, Lock, Loader2, CheckCircle2, ChevronDown,
  MapPin, Shirt,
} from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface Props {
  user:  { name: string; email: string };
  prefs: {
    gender:          string | null;
    skinTone:        string | null;
    city:            string | null;
    preferredStyles: string[];
  } | null;
}

type Tab = "profile" | "style" | "security";

const GENDERS = [
  { value: "MALE",       label: "Male" },
  { value: "FEMALE",     label: "Female" },
  { value: "NONBINARY",  label: "Non-binary" },
  { value: "PREFER_NOT", label: "Prefer not to say" },
];

const SKIN_TONES = [
  { value: "FAIR",   label: "Fair",   hex: "#FDDBB4" },
  { value: "LIGHT",  label: "Light",  hex: "#F5C49B" },
  { value: "MEDIUM", label: "Medium", hex: "#D4956A" },
  { value: "OLIVE",  label: "Olive",  hex: "#B07950" },
  { value: "TAN",    label: "Tan",    hex: "#8D5524" },
  { value: "DARK",   label: "Dark",   hex: "#4A2912" },
];

const STYLES = ["CASUAL", "FORMAL", "SMART_CASUAL", "SPORTY", "STREETWEAR", "BOHEMIAN", "MINIMALIST", "VINTAGE"];
const STYLE_LABELS: Record<string, string> = {
  CASUAL: "Casual", FORMAL: "Formal", SMART_CASUAL: "Smart Casual",
  SPORTY: "Sporty", STREETWEAR: "Streetwear", BOHEMIAN: "Bohemian",
  MINIMALIST: "Minimalist", VINTAGE: "Vintage",
};

export default function SettingsClient({ user, prefs }: Props) {
  const router  = useRouter();
  const [tab, setTab] = useState<Tab>("profile");

  // Profile tab state
  const [name,    setName]    = useState(user.name);
  const [saving1, setSaving1] = useState(false);

  // Style tab state
  const [gender,   setGender]   = useState(prefs?.gender   ?? "");
  const [skinTone, setSkinTone] = useState(prefs?.skinTone ?? "");
  const [city,     setCity]     = useState(prefs?.city     ?? "");
  const [styles,   setStyles]   = useState<string[]>(prefs?.preferredStyles ?? []);
  const [saving2,  setSaving2]  = useState(false);

  // Security tab state
  const [currentPw, setCurrentPw] = useState("");
  const [newPw,     setNewPw]     = useState("");
  const [saving3,   setSaving3]   = useState(false);

  function toggleStyle(s: string) {
    setStyles((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  }

  async function saveProfile() {
    if (!name.trim()) return;
    setSaving1(true);
    const res = await fetch("/api/user/name", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ name: name.trim() }),
    });
    setSaving1(false);
    if (res.ok) {
      toast.success("Name updated.");
      router.refresh();
    } else {
      const j = await res.json();
      toast.error(j.error ?? "Failed to update name.");
    }
  }

  async function saveStyle() {
    setSaving2(true);
    const res = await fetch("/api/user/profile", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        gender:          gender   || undefined,
        skinTone:        skinTone || undefined,
        city:            city.trim() || undefined,
        preferredStyles: styles.length ? styles : undefined,
      }),
    });
    setSaving2(false);
    if (res.ok) toast.success("Style preferences saved.");
    else toast.error("Failed to save preferences.");
  }

  async function savePassword() {
    if (newPw.length < 8) { toast.error("New password must be at least 8 characters."); return; }
    setSaving3(true);
    const res = await fetch("/api/user/password", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
    });
    setSaving3(false);
    if (res.ok) {
      toast.success("Password changed successfully.");
      setCurrentPw("");
      setNewPw("");
    } else {
      const j = await res.json();
      toast.error(j.error ?? "Failed to change password.");
    }
  }

  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "profile",  label: "Profile",    icon: User },
    { id: "style",    label: "Style",      icon: Palette },
    { id: "security", label: "Security",   icon: Lock },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="flex items-center px-4 md:px-8 py-4 md:py-5 border-b border-ink/[0.07] flex-shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-ink">Settings</h1>
          <p className="text-sm text-ink/40 mt-0.5">{user.email}</p>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-4 md:px-8 border-b border-ink/[0.07] flex-shrink-0">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
              tab === t.id
                ? "border-brand-500 text-brand-600"
                : "border-transparent text-ink/40 hover:text-ink/70"
            )}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
        <div className="max-w-lg space-y-6">

          {/* ── Profile tab ──────────────────────────────────────────────── */}
          {tab === "profile" && (
            <div className="space-y-5 animate-fade-in">
              <div className="glass rounded-2xl p-6 space-y-4">
                <h2 className="text-sm font-semibold text-ink">Display name</h2>

                <div className="space-y-1.5">
                  <label className="text-xs text-ink/50 font-medium">Full name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="w-full bg-white border border-ink/[0.12] rounded-xl px-3.5 py-2.5 text-sm text-ink placeholder-ink/30 focus:outline-none focus:border-brand-500 transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-ink/50 font-medium">Email</label>
                  <input
                    type="email"
                    value={user.email}
                    disabled
                    className="w-full bg-surface-2 border border-ink/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-ink/40 cursor-not-allowed"
                  />
                  <p className="text-[11px] text-ink/30">Email cannot be changed.</p>
                </div>

                <button
                  onClick={saveProfile}
                  disabled={saving1 || !name.trim() || name.trim() === user.name}
                  className="flex items-center gap-2 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition-colors"
                >
                  {saving1 && <Loader2 className="w-4 h-4 animate-spin" />}
                  {saving1 ? "Saving…" : "Save name"}
                </button>
              </div>
            </div>
          )}

          {/* ── Style tab ────────────────────────────────────────────────── */}
          {tab === "style" && (
            <div className="space-y-5 animate-fade-in">
              <div className="glass rounded-2xl p-6 space-y-5">
                <h2 className="text-sm font-semibold text-ink">Style preferences</h2>

                {/* Gender */}
                <div className="space-y-2">
                  <label className="text-xs text-ink/50 font-medium flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    Gender identity
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {GENDERS.map((g) => (
                      <button
                        key={g.value}
                        onClick={() => setGender(g.value)}
                        className={cn(
                          "py-2 px-3 rounded-xl text-sm font-medium border transition-all",
                          gender === g.value
                            ? "bg-brand-500/10 border-brand-500/40 text-brand-600"
                            : "bg-white border-ink/[0.10] text-ink/50 hover:text-ink hover:border-ink/20"
                        )}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Skin tone */}
                <div className="space-y-2">
                  <label className="text-xs text-ink/50 font-medium flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5" />
                    Skin tone
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {SKIN_TONES.map((tone) => (
                      <button
                        key={tone.value}
                        onClick={() => setSkinTone(tone.value)}
                        className={cn(
                          "flex items-center gap-2 p-2.5 rounded-xl border transition-all",
                          skinTone === tone.value
                            ? "border-brand-500/50 bg-brand-500/5"
                            : "border-ink/[0.08] bg-white hover:border-ink/20"
                        )}
                      >
                        <div
                          className="w-6 h-6 rounded-full border border-ink/10 flex-shrink-0"
                          style={{ backgroundColor: tone.hex }}
                        />
                        <span className={cn(
                          "text-xs font-medium",
                          skinTone === tone.value ? "text-brand-600" : "text-ink/55"
                        )}>
                          {tone.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* City */}
                <div className="space-y-2">
                  <label className="text-xs text-ink/50 font-medium flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    City (for weather-aware outfits)
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Mumbai, London, New York"
                    className="w-full bg-white border border-ink/[0.12] rounded-xl px-3.5 py-2.5 text-sm text-ink placeholder-ink/30 focus:outline-none focus:border-brand-500 transition-colors"
                  />
                </div>

                {/* Styles */}
                <div className="space-y-2">
                  <label className="text-xs text-ink/50 font-medium flex items-center gap-1.5">
                    <Shirt className="w-3.5 h-3.5" />
                    Preferred styles
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {STYLES.map((s) => (
                      <button
                        key={s}
                        onClick={() => toggleStyle(s)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                          styles.includes(s)
                            ? "bg-brand-500/10 border-brand-500/40 text-brand-600"
                            : "bg-white border-ink/[0.10] text-ink/50 hover:text-ink hover:border-ink/20"
                        )}
                      >
                        {STYLE_LABELS[s]}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={saveStyle}
                  disabled={saving2}
                  className="flex items-center gap-2 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition-colors"
                >
                  {saving2 && <Loader2 className="w-4 h-4 animate-spin" />}
                  {saving2 ? "Saving…" : "Save preferences"}
                </button>
              </div>
            </div>
          )}

          {/* ── Security tab ─────────────────────────────────────────────── */}
          {tab === "security" && (
            <div className="space-y-5 animate-fade-in">
              <div className="glass rounded-2xl p-6 space-y-4">
                <h2 className="text-sm font-semibold text-ink">Change password</h2>

                <div className="space-y-1.5">
                  <label className="text-xs text-ink/50 font-medium">Current password</label>
                  <input
                    type="password"
                    value={currentPw}
                    onChange={(e) => setCurrentPw(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-white border border-ink/[0.12] rounded-xl px-3.5 py-2.5 text-sm text-ink placeholder-ink/30 focus:outline-none focus:border-brand-500 transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-ink/50 font-medium">New password</label>
                  <input
                    type="password"
                    value={newPw}
                    onChange={(e) => setNewPw(e.target.value)}
                    placeholder="Min 8 characters"
                    className="w-full bg-white border border-ink/[0.12] rounded-xl px-3.5 py-2.5 text-sm text-ink placeholder-ink/30 focus:outline-none focus:border-brand-500 transition-colors"
                  />
                </div>

                <button
                  onClick={savePassword}
                  disabled={saving3 || !currentPw || !newPw}
                  className="flex items-center gap-2 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition-colors"
                >
                  {saving3 && <Loader2 className="w-4 h-4 animate-spin" />}
                  {saving3 ? "Changing…" : "Change password"}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
