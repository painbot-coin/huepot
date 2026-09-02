"use client";

import { useLayoutEffect, useRef } from "react";

const NEAR = 72;

export function useChatScroll(key: string) {
  const scroller = useRef<HTMLElement | null>(null);
  const stick = useRef(true);

  function onScroll() {
    const el = scroller.current;
    if (!el) return;
    stick.current = el.scrollHeight - el.scrollTop - el.clientHeight <= NEAR;
  }

  function pinBottom() {
    stick.current = true;
  }

  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el || !stick.current) return;
    el.scrollTop = el.scrollHeight;
    requestAnimationFrame(() => {
      if (!scroller.current || !stick.current) return;
      scroller.current.scrollTop = scroller.current.scrollHeight;
    });
  }, [key]);

  return { scroller, onScroll, pinBottom };
}
