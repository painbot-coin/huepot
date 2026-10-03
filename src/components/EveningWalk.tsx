"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useCopy } from "@/components/LocaleRoot";
import {
  EVENING_BOOK_KEY,
  eveningBookHref,
  eveningBookId,
  eveningCopy,
  eveningHere,
  eveningSteps,
} from "@/lib/evening-path";
import { potLine } from "@/lib/house-tongue";

export function useEveningBook(sit = "") {
  const [book, setBook] = useState("");

  useEffect(() => {
    const opened = eveningBookId(sit);
    const kept = eveningBookId(window.localStorage.getItem(EVENING_BOOK_KEY));
    const next = opened || kept;
    if (opened) window.localStorage.setItem(EVENING_BOOK_KEY, opened);
    setBook(next);
  }, [sit]);

  return book;
}

export function EveningWalk({ sit = "" }: { sit?: string }) {
  const { locale } = useCopy();
  const path = usePathname() || "/";
  const book = useEveningBook(sit);
  const copy = eveningCopy(locale);
  const here = eveningHere(path);
  const steps = eveningSteps(book, locale);

  return (
    <nav aria-label={copy.kicker} className="evening-path">
      <p className="evening-kicker">{copy.kicker}</p>
      <ol className="evening-steps">
        {steps.map((step) => (
          <li key={step.id}>
            <Link
              aria-current={here === step.id ? "step" : undefined}
              className={here === step.id ? "evening-step is-here" : "evening-step"}
              href={step.id === "book" ? eveningBookHref(book) : step.href}
            >
              <strong>{step.title}</strong>
              <span>{step.line}</span>
            </Link>
          </li>
        ))}
      </ol>
      <Link className="evening-classic" href="/rooms/classic">
        <strong>{copy.classic}</strong>
        <span>{potLine(locale)}</span>
      </Link>
    </nav>
  );
}
