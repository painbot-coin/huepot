"use client";

import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Divider from "@mui/material/Divider";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import HouseLink from "@/components/HouseLink";
import { LanguagePick } from "@/components/LanguagePick";
import { useCopy } from "@/components/LocaleRoot";
import { SUPPORT_EMAIL } from "@/lib/config";
import { APP_VERSION } from "@/lib/version";
import type { PublicUser } from "@/lib/types";

function FootCol({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  if (links.length === 0) return null;
  return (
    <Box>
      <Typography
        color="text.secondary"
        sx={{ mb: 1.25, fontWeight: 600, letterSpacing: "0.06em" }}
        variant="caption"
      >
        {title}
      </Typography>
      <Box sx={{ display: "grid", gap: 0.85 }}>
        {links.map((link) => (
          <Link
            component={HouseLink}
            href={link.href}
            key={link.href}
            underline="hover"
            variant="body2"
          >
            {link.label}
          </Link>
        ))}
      </Box>
    </Box>
  );
}

export function SiteFooter({ user }: { user?: PublicUser | null }) {
  const { copy } = useCopy();

  return (
    <Box
      component="footer"
      sx={{
        borderTop: 1,
        borderColor: "divider",
        mt: "auto",
        bgcolor: "background.paper",
      }}
    >
      <Container maxWidth="lg" sx={{ pt: { xs: 4, md: 5 }, pb: { xs: 10, md: 5 } }}>
        <Box
          sx={{
            display: "grid",
            gap: { xs: 3.5, md: 4 },
            gridTemplateColumns: {
              xs: "1fr 1fr",
              md: "1.5fr 1fr 1fr 1fr 0.95fr",
            },
          }}
        >
          <Box sx={{ gridColumn: { xs: "1 / -1", md: "auto" } }}>
            <Typography sx={{ fontFamily: "var(--font-cinzel), serif", fontWeight: 800 }} variant="h6">
              Huepot
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 1, maxWidth: 28 * 8 }} variant="body2">
              {copy.line.tagline}
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 1, maxWidth: 28 * 8 }} variant="body2">
              {copy.line.join}
            </Typography>
          </Box>
          <FootCol
            links={[
              { href: "/", label: copy.nav.home },
              { href: "/network", label: copy.nav.network },
              { href: "/news", label: copy.nav.news },
              { href: "/board", label: copy.nav.leaderboard },
              { href: "/jobs", label: copy.nav.jobs },
              { href: "/contracts", label: copy.nav.contracts },
            ]}
            title={copy.line.house}
          />
          <FootCol
            links={[
              { href: "/wait", label: copy.nav.games },
              { href: "/wait/store", label: copy.nav.store },
              { href: "/how-it-works", label: copy.page.howItWorks },
              { href: "/fairness", label: copy.page.fairness },
            ]}
            title={copy.line.play}
          />
          <FootCol
            links={[
              { href: "/terms", label: copy.page.terms },
              { href: "/privacy", label: copy.page.privacy },
              ...(user
                ? [
                    { href: "/account", label: copy.page.account },
                    { href: "/notifications", label: copy.page.notifications },
                    ...(user.manager || user.reviewer ? [{ href: "/manage", label: copy.page.manage }] : []),
                  ]
                : []),
            ]}
            title={user ? copy.line.sit : copy.line.rules}
          />
          <Box sx={{ gridColumn: { xs: "1 / -1", sm: "auto" } }}>
            <Typography
              color="text.secondary"
              sx={{ mb: 1.25, fontWeight: 600, letterSpacing: "0.06em" }}
              variant="caption"
            >
              {copy.line.language}
            </Typography>
            <LanguagePick />
            <Typography color="text.secondary" sx={{ mt: 2 }} variant="body2">
              18+
            </Typography>
            <Link href={`mailto:${SUPPORT_EMAIL}`} underline="hover" variant="body2">
              {SUPPORT_EMAIL}
            </Link>
          </Box>
        </Box>
        <Divider sx={{ my: { xs: 3, md: 3.5 } }} />
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            gap: 1.5,
          }}
        >
          <Typography color="text.secondary" variant="caption">
            Huepot v{APP_VERSION} · {copy.line.legal}
          </Typography>
          <Typography color="text.secondary" variant="caption">
            {copy.line.support}
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
