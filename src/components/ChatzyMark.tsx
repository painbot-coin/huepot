"use client";

import { useEffect } from "react";

function styleText() {
  const mark = `${window.location.origin}/icon-chatzy.png`;
  return `
.chatzy-chatbot-icon {
  background: #070614 url("${mark}") center / cover no-repeat !important;
}
.chatzy-chatbot-icon img {
  opacity: 0 !important;
  pointer-events: none;
}
`;
}

function stamp(root: ShadowRoot) {
  if (root.querySelector("#huepot-chatzy-mark")) return true;
  const style = document.createElement("style");
  style.id = "huepot-chatzy-mark";
  style.textContent = styleText();
  root.appendChild(style);
  return Boolean(root.querySelector(".chatzy-chatbot-icon"));
}

export function ChatzyMark() {
  useEffect(() => {
    const observers: MutationObserver[] = [];
    let hooked: ShadowRoot | null = null;

    const watch = (root: ShadowRoot) => {
      if (hooked === root) return;
      hooked = root;
      stamp(root);
      const inner = new MutationObserver(() => {
        stamp(root);
      });
      inner.observe(root, { childList: true, subtree: true });
      observers.push(inner);
    };

    const host = document.getElementById("chatzy-shadow-host");
    if (host?.shadowRoot) watch(host.shadowRoot);

    const outer = new MutationObserver(() => {
      const found = document.getElementById("chatzy-shadow-host");
      if (found?.shadowRoot) watch(found.shadowRoot);
    });
    outer.observe(document.body, { childList: true, subtree: true });
    observers.push(outer);

    return () => {
      for (const observer of observers) observer.disconnect();
    };
  }, []);

  return null;
}
