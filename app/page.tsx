import Link from "next/link";
import { Sparkles, Upload, MessageSquare, Shirt } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-ink/[0.07]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
            <Shirt className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-ink text-lg tracking-tight">Armoire</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm text-ink/60 hover:text-ink transition-colors px-4 py-2"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="text-sm bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-lg transition-colors font-medium"
          >
            Get started free
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24 gap-8">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-600 text-sm font-medium">
          <Sparkles className="w-3.5 h-3.5" />
          Armoire AI — Your Personal Stylist
        </div>

        {/* Headline */}
        <h1 className="text-5xl md:text-7xl font-bold text-ink max-w-3xl leading-tight tracking-tight">
          Your Personal{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-500 to-brand-700">
            AI Closet
          </span>
        </h1>

        <p className="text-lg text-ink/55 max-w-xl leading-relaxed">
          Upload your clothes once. Get personalized outfit recommendations for
          every occasion — styled by Aria, your AI stylist that knows your wardrobe better than you do.
        </p>

        <p className="text-sm text-brand-600 font-medium tracking-wide">
          Your Personal AI Closet — powered by Aria
        </p>

        <div className="flex gap-3 flex-wrap justify-center">
          <Link
            href="/signup"
            className="px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-brand-500/20"
          >
            Start for free
          </Link>
          <Link
            href="/login"
            className="px-6 py-3 bg-surface-1 hover:bg-surface-2 text-ink rounded-xl font-semibold transition-colors border border-ink/[0.10]"
          >
            Sign in
          </Link>
        </div>
      </main>

      {/* Feature grid */}
      <section className="px-8 pb-24 max-w-5xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              icon: Upload,
              title: "Upload your wardrobe",
              desc: "Snap photos of your clothes. AI instantly tags color, style, and occasion.",
            },
            {
              icon: Sparkles,
              title: "Armoire AI engine",
              desc: "Smart color matching, style compatibility, and occasion-aware recommendations.",
            },
            {
              icon: MessageSquare,
              title: "Chat with Aria",
              desc: "\"Make it more casual\" or \"something with black\" — refine via natural conversation.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="glass rounded-2xl p-6 flex flex-col gap-3 hover:border-brand-500/30 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center">
                <f.icon className="w-5 h-5 text-brand-600" />
              </div>
              <h3 className="font-semibold text-ink">{f.title}</h3>
              <p className="text-sm text-ink/50 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="text-center py-6 text-ink/30 text-sm border-t border-ink/[0.06]">
        © {new Date().getFullYear()} Armoire. Your Personal AI Closet — powered by Aria
      </footer>
    </div>
  );
}
