"use client";

import DarkMode from "@mui/icons-material/DarkMode";
import LightMode from "@mui/icons-material/LightMode";
import SettingsBrightness from "@mui/icons-material/SettingsBrightness";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { useColorScheme } from "@mui/material/styles";
import { useState } from "react";
import { THEME_MODES, type ThemeMode } from "@/lib/house-mui";

const LABEL: Record<ThemeMode, string> = {
  light: "Light",
  dark: "Dark",
  system: "System",
};

export function ThemeModeToggle() {
  const { mode, setMode } = useColorScheme();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const current: ThemeMode = mode === "dark" || mode === "light" || mode === "system" ? mode : "system";

  return (
    <>
      <IconButton
        aria-expanded={Boolean(anchor)}
        aria-haspopup="menu"
        aria-label={`Color mode: ${LABEL[current]}`}
        color="inherit"
        onClick={(event) => setAnchor(event.currentTarget)}
      >
        {current === "dark" ? (
          <DarkMode />
        ) : current === "light" ? (
          <LightMode />
        ) : (
          <SettingsBrightness />
        )}
      </IconButton>
      <Menu anchorEl={anchor} onClose={() => setAnchor(null)} open={Boolean(anchor)}>
        {THEME_MODES.map((item) => (
          <MenuItem
            key={item}
            onClick={() => {
              setMode(item);
              setAnchor(null);
            }}
            selected={current === item}
          >
            {LABEL[item]}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
