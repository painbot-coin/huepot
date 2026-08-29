import type { Metadata } from "next";
import { Cinzel, Outfit } from "next/font/google";
import { AgeBanner } from "@/components/AgeBanner";
import { Atmosphere } from "@/components/Atmosphere";
import { PlayBlockBanner } from "@/components/PlayBlockBanner";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { SoundBus } from "@/components/SoundBus";
import { VerifyBanner } from "@/components/VerifyBanner";
import { getHeaderUser } from "@/lib/auth";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Huepot — color take",
  description:
    "Same-price color buttons. Biggest color splits the rest of the pot.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getHeaderUser();
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${cinzel.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col" suppressHydrationWarning>
        <Atmosphere />
        <SoundBus />
        <SiteHeader user={user} />
        {user && !user.ageConfirmed ? <AgeBanner /> : null}
        {user && !user.emailVerified ? <VerifyBanner email={user.email} /> : null}
        {user?.blocked && user.blockKind !== "age" ? <PlayBlockBanner user={user} /> : null}
        <div className="page-stage flex-1">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
