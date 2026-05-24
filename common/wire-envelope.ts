/** JSON wire format between MCP server and browser extension. */

export interface WireEnvelope {
  payload: unknown;
  signature?: string;
}

export function hasPayloadEnvelope(value: unknown): value is WireEnvelope {
  return (
    typeof value === "object" &&
    value !== null &&
    "payload" in value
  );
}

export function packEnvelope(
  payload: unknown,
  signature?: string
): string {
  if (signature) {
    return JSON.stringify({ payload, signature });
  }
  return JSON.stringify({ payload });
}
