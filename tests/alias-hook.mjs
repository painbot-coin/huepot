// The app imports itself as "@/lib/…", which is a tsconfig path alias that
// Node knows nothing about. Rather than rewrite application source to suit the
// tests, this teaches the loader the same mapping.
//
// Registered by tests/register.mjs, which the test script loads with --import.

import { pathToFileURL } from "node:url";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");

export async function resolve(specifier, context, next) {
  let resolved;
  if (specifier.startsWith("@/")) {
    const target = path.join(root, "src", specifier.slice(2));
    // The alias is written without an extension; the sources are .ts.
    const withExt = /\.[a-z]+$/.test(target) ? target : `${target}.ts`;
    resolved = await next(pathToFileURL(withExt).href, context);
  } else {
    resolved = await next(specifier, context);
  }
  // The root package.json has no "type", so Node warns that each .ts file
  // under src had to be reparsed as a module. Saying so up front is quieter
  // than declaring the whole application to be ESM for the sake of tests.
  if (!resolved.format && resolved.url.startsWith("file:") && resolved.url.endsWith(".ts")) {
    return { ...resolved, format: "module-typescript" };
  }
  return resolved;
}
