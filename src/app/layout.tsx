import type { Metadata, Viewport } from "next";
import { Cinzel, Outfit } from "next/font/google";
import { AgeBanner } from "@/components/AgeBanner";
import { ChatzyMark } from "@/components/ChatzyMark";
import { LazyFx, LazyMessageDock } from "@/components/LazyFx";
import { PlayBlockBanner } from "@/components/PlayBlockBanner";
import { RefCookie } from "@/components/RefCookie";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getHeaderUser } from "@/lib/auth";
import { appUrl } from "@/lib/config";
import "./globals.css";

export const dynamic = "force-dynamic";

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
  // "The house" is the voice, but a search result or a shared link has to say
  // what this is. Child pages keep their own title and gain the suffix.
  title: {
    default: "Huepot — same price, biggest color takes",
    template: "%s · Huepot",
  },
  description:
    "A timed color-pot house. Every coin costs the same, and when time runs out the color with the most clicks takes the rest of the pot. Provably fair, 18+.",
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
      "A timed color-pot house. Click a color, biggest color takes the pot.",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#070614",
  colorScheme: "dark",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getHeaderUser();
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${cinzel.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <link
          href="https://chatzy-kb-store.s3.amazonaws.com/icons/5ab07987-b5db-477c-82ff-1287e0883acb"
          rel="stylesheet"
        />
        <script
          className="chatzy_widget_script"
          defer
          id="38f024d0-53cf-4388-8570-6c76bd34f293"
          src="https://chatzy-kb-store.s3.amazonaws.com/icons/56706cc4-b3ba-4eba-9610-f2fb07008a5c"
        />
      </head>
      <body className="flex min-h-full flex-col" suppressHydrationWarning>
        {/* The backdrop plate is the first thing a player sees, so start it
            with the stylesheet rather than after it parses. */}
        <link
          as="image"
          href="/fx/huepot-hall.jpg"
          media="(min-aspect-ratio: 1/1)"
          rel="preload"
        />
        <link
          as="image"
          href="/fx/huepot-hall-tall.jpg"
          media="(max-aspect-ratio: 1/1)"
          rel="preload"
        />
        <LazyFx />
        <ChatzyMark />
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
