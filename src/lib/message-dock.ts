export const MESSAGE_OPEN = "huepot:message";

export function openMessageDock(username = "") {
  window.dispatchEvent(new CustomEvent(MESSAGE_OPEN, { detail: { username } }));
}
