import type { Metadata, Viewport } from "next";
import InitColorSchemeScript from "@mui/material/InitColorSchemeScript";
import { Cinzel, Outfit } from "next/font/google";
import { AgeBanner } from "@/components/AgeBanner";
import { ChatzyMark } from "@/components/ChatzyMark";
import { LazyMessageDock } from "@/components/LazyFx";
import { PlayBlockBanner } from "@/components/PlayBlockBanner";
import { RefCookie } from "@/components/RefCookie";
import { VisitPing } from "@/components/VisitPing";
import { HouseDock } from "@/components/HouseDock";
import { LocaleRoot } from "@/components/LocaleRoot";
import { MuiRoot } from "@/components/MuiRoot";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getHeaderUser } from "@/lib/auth";
import { appUrl } from "@/lib/config";
import { localeMeta } from "@/lib/locale";
import { readRequestLocale } from "@/lib/request-locale";
import "./globals.css";

export const dynamic = "force-dynamic";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin", "latin-ext"],
});

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["600", "700", "800", "900"],
});

export const metadata: Metadata = {
  metadataBase: new URL(appUrl()),
  // "The house" is the voice, but a search result or a shared link has to say
  // what this is. Child pages keep their own title and gain the suffix.
  title: {
    default: "Huepot — same price, biggest color takes",
    template: "%s · Huepot",
  },
  description:
    "Where game developers, AI developers, gamers, and bettors meet. Timed color pot: same price, biggest color takes. Share a project. Buy a trained file. 18+.",
  applicationName: "Huepot",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180" }],
  },
  appleWebApp: {
    title: "Huepot",
    statusBarStyle: "black-translucent",
  },
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Huepot",
    url: "/",
    title: "Huepot — same price, biggest color takes",
    description:
      "A seat for anyone. Same price, biggest color takes. The pot stays on Classic.",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#efe6d2" },
    { media: "(prefers-color-scheme: dark)", color: "#16140f" },
  ],
  colorScheme: "light dark",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getHeaderUser();
  const locale = await readRequestLocale();
  const dir = localeMeta(locale).dir;
  return (
    <html
      lang={locale}
      dir={dir}
      className={`${outfit.variable} ${cinzel.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col" suppressHydrationWarning>
        <InitColorSchemeScript attribute="data-mui-color-scheme" defaultMode="dark" />
        <MuiRoot>
          <LocaleRoot locale={locale}>
            <ChatzyMark />
            <RefCookie />
            <VisitPing />
            <SiteHeader user={user} />
            {user ? <LazyMessageDock /> : null}
            {user && !user.ageConfirmed ? <AgeBanner /> : null}
            {user?.blocked && user.blockKind !== "age" ? <PlayBlockBanner user={user} /> : null}
            <div className="house-stage-pad flex-1">{children}</div>
            <HouseDock signedIn={Boolean(user)} username={user?.username ?? ""} />
            <SiteFooter user={user} />
          </LocaleRoot>
        </MuiRoot>
      </body>
    </html>
  );
}
