"use client";

import { createTheme } from "@mui/material/styles";
import {
  HOUSE_AMBER,
  HOUSE_BG,
  HOUSE_FIRE,
  HOUSE_GOLD,
  HOUSE_INK,
  HOUSE_LIGHT_BG,
  HOUSE_LIGHT_FIRE,
  HOUSE_LIGHT_INK,
  HOUSE_LIGHT_LINE,
  HOUSE_LIGHT_MUTED,
  HOUSE_LIGHT_PAPER,
  HOUSE_LINE,
  HOUSE_MUTED,
  HOUSE_SLATE,
} from "@/lib/house-mui";

const theme = createTheme({
  cssVariables: {
    colorSchemeSelector: "data-mui-color-scheme",
  },
  colorSchemes: {
    light: {
      palette: {
        primary: { main: HOUSE_AMBER, contrastText: "#1a1610" },
        secondary: { main: HOUSE_LIGHT_FIRE, contrastText: "#f7f1e4" },
        background: { default: HOUSE_LIGHT_BG, paper: HOUSE_LIGHT_PAPER },
        text: { primary: HOUSE_LIGHT_INK, secondary: HOUSE_LIGHT_MUTED },
        divider: HOUSE_LIGHT_LINE,
        error: { main: "#c62828" },
      },
    },
    dark: {
      palette: {
        primary: { main: HOUSE_AMBER, contrastText: "#1a1610" },
        secondary: { main: HOUSE_FIRE, contrastText: "#f3efe4" },
        background: { default: HOUSE_BG, paper: HOUSE_SLATE },
        text: { primary: HOUSE_INK, secondary: HOUSE_MUTED },
        divider: HOUSE_LINE,
        error: { main: "#ff6b7a" },
      },
    },
  },
  typography: {
    fontFamily: "var(--font-outfit), sans-serif",
    h1: { fontFamily: "var(--font-outfit), sans-serif", fontWeight: 700, letterSpacing: "-0.03em" },
    h2: { fontFamily: "var(--font-outfit), sans-serif", fontWeight: 700, letterSpacing: "-0.02em" },
    h3: { fontFamily: "var(--font-outfit), sans-serif", fontWeight: 700, letterSpacing: "-0.02em" },
    h4: { fontFamily: "var(--font-outfit), sans-serif", fontWeight: 700, letterSpacing: "-0.02em" },
    h6: { fontFamily: "var(--font-cinzel), serif", fontWeight: 800 },
    overline: { letterSpacing: "0.06em", fontWeight: 600 },
    button: { textTransform: "none", fontWeight: 600 },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          minWidth: 0,
          lineHeight: 1.25,
          borderRadius: 10,
          padding: "8px 16px",
        },
        contained: {
          backgroundColor: HOUSE_AMBER,
          color: "#1a1610",
          "&:hover": { backgroundColor: HOUSE_GOLD },
        },
        outlined: {
          backgroundColor: "transparent",
          borderColor: "var(--mui-palette-divider)",
          color: "var(--mui-palette-text-primary)",
          "&:hover": {
            backgroundColor: "color-mix(in srgb, var(--mui-palette-primary-main) 10%, transparent)",
            borderColor: HOUSE_GOLD,
          },
        },
        text: { color: "var(--mui-palette-secondary-main)" },
      },
    },
    MuiTextField: {
      defaultProps: { variant: "outlined", size: "small", fullWidth: true },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: "var(--mui-palette-background-paper)",
          color: "var(--mui-palette-text-primary)",
          fontSize: 16,
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: "var(--mui-palette-divider)",
          },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: HOUSE_GOLD,
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: HOUSE_AMBER,
            borderWidth: 1,
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          backgroundColor: "var(--mui-palette-background-paper)",
          border: "1px solid var(--mui-palette-divider)",
          boxShadow: "0 1px 2px color-mix(in srgb, #000 7%, transparent)",
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          backgroundImage: "none",
          minWidth: 12,
        },
      },
    },
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundImage: "none",
        },
      },
    },
    MuiAppBar: {
      defaultProps: { color: "default", elevation: 0 },
      styleOverrides: {
        root: {
          backgroundImage: "none",
          backgroundColor: "var(--mui-palette-background-default)",
          borderBottom: "1px solid var(--mui-palette-divider)",
          color: "var(--mui-palette-text-primary)",
        },
      },
    },
    MuiAlert: {
      defaultProps: { variant: "outlined" },
      styleOverrides: {
        root: { borderRadius: 10 },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          color: "var(--mui-palette-text-secondary)",
          minHeight: 36,
          padding: "6px 12px",
          textTransform: "none",
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: { backgroundColor: HOUSE_AMBER },
      },
    },
    MuiBottomNavigation: {
      styleOverrides: {
        root: {
          backgroundColor: "var(--mui-palette-background-paper)",
          height: 56,
        },
      },
    },
    MuiLink: {
      defaultProps: { underline: "hover" },
      styleOverrides: {
        root: { color: "var(--mui-palette-secondary-main)" },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          "&.Mui-selected": {
            backgroundColor: "color-mix(in srgb, var(--mui-palette-primary-main) 16%, transparent)",
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 999 },
        filled: {
          backgroundColor: HOUSE_AMBER,
          color: "#1a1610",
        },
      },
    },
    MuiCheckbox: {
      styleOverrides: {
        root: { color: "var(--mui-palette-text-secondary)" },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: { color: "var(--mui-palette-text-primary)" },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: { color: "var(--mui-palette-text-primary)" },
      },
    },
  },
});

export default theme;
