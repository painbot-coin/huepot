"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import BottomNavigation from "@mui/material/BottomNavigation";
import BottomNavigationAction from "@mui/material/BottomNavigationAction";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import FormControlLabel from "@mui/material/FormControlLabel";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type { ButtonProps } from "@mui/material/Button";
import type { TextFieldProps } from "@mui/material/TextField";
import type { InputHTMLAttributes, ReactNode } from "react";
import HouseLink from "@/components/HouseLink";

export function PageHead({
  title,
  lead,
}: {
  title: string;
  lead?: ReactNode;
}) {
  return (
    <Box sx={{ mb: 3 }}>
      <Typography component="h1" variant="h4">
        {title}
      </Typography>
      {lead ? (
        <Typography color="text.secondary" sx={{ mt: 1.25, maxWidth: "40rem" }} variant="body1">
          {lead}
        </Typography>
      ) : null}
    </Box>
  );
}

export function HouseButton({
  href,
  ghost,
  children,
  type = "button",
  ...rest
}: Omit<ButtonProps, "href" | "variant"> & {
  href?: string;
  ghost?: boolean;
}) {
  const variant = ghost ? "outlined" : "contained";
  if (href) {
    const appPath = !href.startsWith("/api/") && !href.startsWith("http");
    if (appPath) {
      return (
        <Button
          color={rest.color}
          component={HouseLink}
          disabled={rest.disabled}
          href={href}
          size={rest.size}
          variant={variant}
        >
          {children}
        </Button>
      );
    }
    return (
      <Button
        color={rest.color}
        component="a"
        disabled={rest.disabled}
        href={href}
        size={rest.size}
        variant={variant}
      >
        {children}
      </Button>
    );
  }
  return (
    <Button {...rest} type={type} variant={variant}>
      {children}
    </Button>
  );
}

export function HouseField({
  inputProps,
  maxLength,
  ...props
}: TextFieldProps & {
  inputProps?: InputHTMLAttributes<HTMLInputElement>;
  maxLength?: number;
}) {
  return (
    <TextField {...props} slotProps={{ htmlInput: { maxLength, ...inputProps } }} />
  );
}

export function HouseSelect({
  label,
  value,
  onChange,
  children,
}: {
  className?: string;
  label?: string;
  value: string | number;
  onChange: (next: string) => void;
  children: ReactNode;
}) {
  return (
    <TextField
      label={label}
      onChange={(event) => onChange(event.target.value)}
      select
      value={value}
    >
      {children}
    </TextField>
  );
}

export function HouseAlert({
  children,
  severity = "error",
}: {
  children: ReactNode;
  severity?: "error" | "info" | "success" | "warning";
}) {
  return <Alert severity={severity}>{children}</Alert>;
}

export function HouseChip({
  label,
  on,
  href,
  onClick,
}: {
  label: string;
  on?: boolean;
  href?: string;
  onClick?: () => void;
}) {
  if (href) {
    return (
      <Chip
        clickable
        color={on ? "primary" : "default"}
        component={HouseLink}
        href={href}
        label={label}
        variant={on ? "filled" : "outlined"}
      />
    );
  }
  return (
    <Chip
      color={on ? "primary" : "default"}
      label={label}
      onClick={onClick}
      variant={on ? "filled" : "outlined"}
    />
  );
}

export function HouseCheck({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: ReactNode;
  onChange: (next: boolean) => void;
}) {
  return (
    <FormControlLabel
      control={<Checkbox checked={checked} onChange={(event) => onChange(event.target.checked)} />}
      label={label}
    />
  );
}

export function HouseTabs({
  value,
  onChange,
  items,
}: {
  value: string;
  onChange: (next: string) => void;
  items: { id: string; label: string }[];
}) {
  return (
    <Tabs onChange={(_, next: string) => onChange(next)} value={value} variant="scrollable">
      {items.map((item) => (
        <Tab key={item.id} label={item.label} value={item.id} />
      ))}
    </Tabs>
  );
}

export function HouseNavTabs({
  value,
  items,
}: {
  value: string | false;
  items: { href: string; label: string; id: string }[];
}) {
  return (
    <Tabs value={value} variant="scrollable">
      {items.map((item) => (
        <Tab
          component={HouseLink}
          href={item.href}
          key={item.id}
          label={item.label}
          value={item.id}
        />
      ))}
    </Tabs>
  );
}

export function HouseFloorNav({
  value,
  items,
}: {
  value: string;
  items: { href: string; label: string; id: string }[];
}) {
  return (
    <BottomNavigation showLabels value={value}>
      {items.map((item) => (
        <BottomNavigationAction
          component={HouseLink}
          href={item.href}
          key={item.id}
          label={item.label}
          value={item.id}
        />
      ))}
    </BottomNavigation>
  );
}

export { HouseLink, Menu, MenuItem };
