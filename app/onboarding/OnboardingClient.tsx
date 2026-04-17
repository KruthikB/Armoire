"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shirt, ChevronRight, Loader2, MapPin, User, Palette } from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

const STEPS = 3;

const GENDERS = [
  { value: "MALE",       label: "Male" },
  { value: "FEMALE",     label: "Female" },
  { value: "NONBINARY",  label: "Non-binary" },
  { value: "PREFER_NOT", label: "Prefer not to say" },
];

const SKIN_TONES = [
  { value: "FAIR",   label: "Fair",   hex: "#FDDBB4", desc: "Very light, burns easily" },
  { value: "LIGHT",  label: "Light",  hex: "#F5C49B", desc: "Light, sometimes tans" },
  { value: "MEDIUM", label: "Medium", hex: "#D4956A", desc: "Medium, tans easily" },
  { value: "OLIVE",  label: "Olive",  hex: "#B07950", desc: "Olive, tans well" },
  { value: "TAN",    label: "Tan",    hex: "#8D5524", desc: "Brown, rarely burns" },
  { value: "DARK",   label: "Dark",   hex: "#4A2912", desc: "Deep brown / dark" },
];

const STYLES = [
  "CASUAL", "FORMAL", "SMART_CASUAL", "SPORTY",
  "STREETWEAR", "BOHEMIAN", "MINIMALIST", "VINTAGE",
];
const STYLE_LABELS: Record<string, string> = {
  CASUAL: "Casual", FORMAL: "Formal", SMART_CASUAL: "Smart Casual",
  SPORTY: "Sporty", STREETWEAR: "Streetwear", BOHEMIAN: "Bohemian",
  MINIMALIST: "Minimalist", VINTAGE: "Vintage",
};

export default function OnboardingClient({ userName }: { userName: string }) {
  const router = useRouter();
  const [step,     setStep]     = useState(1);
  const [gender,   setGender]   = useState("");
  const [skinTone, setSkinTone] = useState("");
  const [city,     setCity]     = useState("");
  const [styles,   setStyles]   = useState<string[]>([]);
  const [saving,   setSaving]   = useState(false);

  function toggleStyle(s: string) {
    setStyles((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  }

  async function handleFinish() {
    setSaving(true);
    const res = await fetch("/api/user/profile", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        gender:              gender   || undefined,
        skinTone:            skinTone || undefined,
        city:                city.trim() || undefined,
        preferredStyles:     styles.length ? styles : undefined,
        onboardingCompleted: true,
      }),
    });
    setSaving(false);

    if (!res.ok) {
      toast.error("Failed to save profile. Please try again.");
      return;
    }
    toast.success("Profile saved! Welcome to Armoire.");
    router.push("/wardrobe");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in">
        {/* Header */}
        <div className="text-center space-y-2 mb-8">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-brand-500 items-center justify-center mx-auto">
            <Shirt className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-ink">
            Welcome, {userName.split(" ")[0]}!
          </h1>
          <p className="text-ink/50 text-sm">
            Let&apos;s set up your profile for personalised outfit suggestions.
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6 justify-center">
          {Array.from({ length: STEPS }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i + 1 <= step ? "bg-brand-500 w-8" : "bg-surface-3 w-4"
              )}
            />
          ))}
        </div>

        <div className="glass rounded-2xl p-6 space-y-6">

          {/* Step 1: Gender */}
          {step === 1 && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-2 text-ink/60 text-sm font-medium">
                <User className="w-4 h-4" />
                <span>How do you identify?</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {GENDERS.map((g) => (
                  <button
                    key={g.value}
                    onClick={() => setGender(g.value)}
                    className={cn(
                      "py-2.5 px-3 rounded-xl text-sm font-medium border transition-all",
                      gender === g.value
                        ? "bg-brand-500/10 border-brand-500/40 text-brand-600"
                        : "bg-white border-ink/[0.10] text-ink/50 hover:text-ink hover:border-ink/[0.20]"
                    )}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-ink/30">
                This helps Aria personalise style suggestions for you.
              </p>
            </div>
          )}

          {/* Step 2: Skin tone */}
          {step === 2 && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-2 text-ink/60 text-sm font-medium">
                <Palette className="w-4 h-4" />
                <span>What&apos;s your skin tone?</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {SKIN_TONES.map((tone) => (
                  <button
                    key={tone.value}
                    onClick={() => setSkinTone(tone.value)}
                    className={cn(
                      "flex flex-col items-center gap-2 p-3 rounded-xl border transition-all",
                      skinTone === tone.value
                        ? "border-brand-500/50 bg-brand-500/5"
                        : "border-ink/[0.08] bg-white hover:border-ink/[0.20]"
                    )}
                  >
                    <div
                      className="w-10 h-10 rounded-full border-2 border-ink/10 shadow-inner"
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
              <p className="text-xs text-ink/30">
                We&apos;ll suggest colors that complement your complexion.
              </p>
            </div>
          )}

          {/* Step 3: City + styles */}
          {step === 3 && (
            <div className="space-y-5 animate-fade-in">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-ink/60 text-sm font-medium">
                  <MapPin className="w-4 h-4" />
                  <span>Your city (for weather-aware outfits)</span>
                </div>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Mumbai, London, New York"
                  className="w-full bg-white border border-ink/[0.12] rounded-xl px-3.5 py-2.5 text-sm text-ink placeholder-ink/30 focus:outline-none focus:border-brand-500 transition-colors"
                />
              </div>

              <div className="space-y-3">
                <p className="text-ink/60 text-sm font-medium">
                  Preferred styles <span className="text-ink/30 font-normal">(optional)</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {STYLES.map((s) => (
                    <button
                      key={s}
                      onClick={() => toggleStyle(s)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                        styles.includes(s)
                          ? "bg-brand-500/10 border-brand-500/40 text-brand-600"
                          : "bg-white border-ink/[0.10] text-ink/50 hover:text-ink hover:border-ink/[0.20]"
                      )}
                    >
                      {STYLE_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-2">
            {step > 1 ? (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="text-sm text-ink/40 hover:text-ink/70 transition-colors"
              >
                Back
              </button>
            ) : (
              <div />
            )}

            {step < STEPS ? (
              <button
                onClick={() => setStep((s) => s + 1)}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-medium transition-colors"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleFinish}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {saving ? "Saving…" : "Start styling"}
              </button>
            )}
          </div>
        </div>

        {/* Skip */}
        <p className="text-center text-ink/30 text-xs mt-4">
          <button
            onClick={async () => {
              await fetch("/api/user/profile", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ onboardingCompleted: true }),
              });
              router.push("/wardrobe");
              router.refresh();
            }}
            className="hover:text-ink/60 transition-colors underline underline-offset-2"
          >
            Skip for now
          </button>
        </p>
      </div>
    </div>
  );
}
