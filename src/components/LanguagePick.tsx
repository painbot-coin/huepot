"use client";

import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import { useRouter } from "next/navigation";
import { useCopy } from "@/components/LocaleRoot";
import { LOCALES, type LocaleId, parseLocale } from "@/lib/locale";

export function LanguagePick() {
  const { locale, copy, setLocale } = useCopy();
  const router = useRouter();

  async function choose(next: LocaleId) {
    setLocale(next);
    document.documentElement.lang = next;
    document.documentElement.dir = LOCALES.find((row) => row.id === next)?.dir ?? "ltr";
    await fetch("/api/locale", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ locale: next }),
    });
    router.refresh();
  }

  return (
    <FormControl fullWidth size="small">
      <InputLabel id="house-lang">{copy.line.language}</InputLabel>
      <Select
        label={copy.line.language}
        labelId="house-lang"
        onChange={(event) => {
          const next = parseLocale(String(event.target.value));
          if (next) void choose(next);
        }}
        value={locale}
      >
        {LOCALES.map((row) => (
          <MenuItem key={row.id} value={row.id}>
            {row.name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
