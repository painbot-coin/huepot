"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { copyFor, type HouseCopy } from "@/lib/copy";
import { DEFAULT_LOCALE, type LocaleId } from "@/lib/locale";

const LocaleContext = createContext<{
  locale: LocaleId;
  copy: HouseCopy;
  setLocale: (next: LocaleId) => void;
}>({
  locale: DEFAULT_LOCALE,
  copy: copyFor(DEFAULT_LOCALE),
  setLocale: () => {},
});

export function LocaleRoot({
  locale,
  children,
}: {
  locale: LocaleId;
  children: ReactNode;
}) {
  const [current, setCurrent] = useState(locale);
  useEffect(() => {
    setCurrent(locale);
  }, [locale]);
  const value = useMemo(
    () => ({ locale: current, copy: copyFor(current), setLocale: setCurrent }),
    [current],
  );
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useCopy() {
  return useContext(LocaleContext);
}
