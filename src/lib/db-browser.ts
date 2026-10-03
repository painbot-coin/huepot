/**
 * Browser bundles reach this through a server module that only needed a
 * constant. The database itself stays on the server.
 */
function unavailable(): never {
  throw new Error("The house database is only available on the server.");
}

export const prisma = new Proxy(
  {},
  {
    get: unavailable,
  },
);
