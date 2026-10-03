import { readFileSync } from "node:fs";
import path from "node:path";

let cached: string | undefined;

function underTest() {
  const blob = `${process.execArgv.join(" ")}\n${process.argv.join(" ")}`;
  return /(?:^|[\s"'\\/])(?:--test|tests[\\/])/.test(blob);
}

function unquote(value: string) {
  const text = value.trim();
  if (
    (text.startsWith('"') && text.endsWith('"')) ||
    (text.startsWith("'") && text.endsWith("'"))
  ) {
    return text.slice(1, -1);
  }
  return text;
}

function readCredentialFile() {
  try {
    const text = readFileSync(path.join(process.cwd(), "atlas-credentials.env"), "utf8");
    for (const line of text.split(/\r?\n/)) {
      const match = line.match(/^\s*MONGODB_URI\s*=\s*(.*)$/);
      if (match) return unquote(match[1] ?? "");
    }
  } catch {
    /* the server keeps the URI in its own env */
  }
  return "";
}

function withDatabase(uri: string, name: string) {
  const match = uri.match(/^(mongodb(?:\+srv)?:\/\/[^/?]+)(\/[^?]*)?(\?.*)?$/i);
  if (!match) return uri;
  const pathName = match[2] ?? "";
  if (pathName && pathName !== "/") return uri;
  const query = match[3] || "?retryWrites=true&w=majority";
  return `${match[1]}/${name}${query}`;
}

/** Empty when this process should keep SQLite. Never log the return value. */
export function atlasUri() {
  if (cached !== undefined) return cached;
  if (underTest()) {
    cached = "";
    return cached;
  }
  const fromEnv = unquote(process.env.MONGODB_URI ?? "");
  const raw = fromEnv || readCredentialFile();
  cached = raw ? withDatabase(raw, "huepot") : "";
  return cached;
}

export function redactMongo(message: string) {
  return message.replace(/mongodb(?:\+srv)?:\/\/\S+/gi, "mongodb://…");
}
