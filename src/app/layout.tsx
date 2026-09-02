import type { Metadata } from "next";
import { Cinzel, Outfit } from "next/font/google";
import { AgeBanner } from "@/components/AgeBanner";
import { LazyFx, LazyMessageDock } from "@/components/LazyFx";
import { PlayBlockBanner } from "@/components/PlayBlockBanner";
import { RefCookie } from "@/components/RefCookie";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getHeaderUser } from "@/lib/auth";
import { appUrl } from "@/lib/config";
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
  metadataBase: new URL(appUrl()),
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
        <LazyFx />
        <RefCookie />
        <SiteHeader user={user} />
        {user ? <LazyMessageDock /> : null}
        {user && !user.ageConfirmed ? <AgeBanner /> : null}
        {user?.blocked && user.blockKind !== "age" ? <PlayBlockBanner user={user} /> : null}
        <div className="page-stage flex-1">{children}</div>
        <SiteFooter user={user} />
      </body>
    </html>
  );
}
