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

const CHATZY_SHEET =
  "https://chatzy-kb-store.s3.amazonaws.com/icons/5ab07987-b5db-477c-82ff-1287e0883acb";
const CHATZY_SCRIPT =
  "https://chatzy-kb-store.s3.amazonaws.com/icons/56706cc4-b3ba-4eba-9610-f2fb07008a5c";
const CHATZY_SCRIPT_ID = "38f024d0-53cf-4388-8570-6c76bd34f293";

function loadChatzy() {
  if (!document.querySelector(`link[href="${CHATZY_SHEET}"]`)) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = CHATZY_SHEET;
    document.head.appendChild(link);
  }
  if (!document.getElementById(CHATZY_SCRIPT_ID)) {
    const script = document.createElement("script");
    script.id = CHATZY_SCRIPT_ID;
    script.className = "chatzy_widget_script";
    script.src = CHATZY_SCRIPT;
    script.defer = true;
    document.body.appendChild(script);
  }
}

export function ChatzyMark() {
  useEffect(() => {
    loadChatzy();
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
