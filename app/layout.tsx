import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Armoire", template: "%s | Armoire" },
  description: "Your Personal AI Closet — powered by Aria. Upload your clothes and get smart outfit recommendations.",
  keywords: ["armoire", "wardrobe", "outfit", "AI stylist", "fashion", "clothing", "Aria"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#FAF7F2",
              color: "#1A1714",
              border: "1px solid rgba(26,23,20,0.10)",
              borderRadius: "12px",
              fontSize: "14px",
              boxShadow: "0 4px 24px rgba(26,23,20,0.10)",
            },
            success: { iconTheme: { primary: "#8B7355", secondary: "#FAF7F2" } },
          }}
        />
      </body>
    </html>
  );
}
