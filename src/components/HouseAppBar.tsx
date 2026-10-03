"use client";

import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";
import { BrandMark } from "@/components/BrandMark";
import { HouseSearch, HouseTabs } from "@/components/HouseBar";
import HouseLink from "@/components/HouseLink";
import { ThemeModeToggle } from "@/components/ThemeModeToggle";

export function HouseAppBar({ nav }: { nav: ReactNode }) {
  return (
    <AppBar color="default" elevation={0} position="sticky">
      <Toolbar sx={{ gap: 2, minHeight: { xs: 56, md: 64 } }}>
        <Box
          component={HouseLink}
          href="/"
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            color: "text.primary",
            textDecoration: "none",
            flexShrink: 0,
          }}
        >
          <BrandMark />
          <Typography
            sx={{ fontFamily: "var(--font-cinzel), serif", fontWeight: 800 }}
            variant="h6"
          >
            Huepot
          </Typography>
        </Box>
        <Box sx={{ flex: 1, maxWidth: 420, display: { xs: "none", md: "block" } }}>
          <HouseSearch />
        </Box>
        <Box sx={{ flex: 1, display: { xs: "none", md: "flex" }, justifyContent: "center" }}>
          <HouseTabs />
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, ml: "auto" }}>
          <ThemeModeToggle />
          {nav}
        </Box>
      </Toolbar>
    </AppBar>
  );
}
