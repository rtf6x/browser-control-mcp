export interface ExtensionRegisterMessage {
  type: "register";
  browserId: string;
  label?: string;
  browserType?: string;
}

export interface RegisterAckMessage {
  type: "register-ack";
  browserId: string;
}

export const BROWSER_ID_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;

/** Trim, collapse whitespace/dashes, validate browserId for storage and MCP routing. */
export function normalizeBrowserId(raw: string): string {
  const normalized = raw
    .trim()
    .replace(/[\u2010-\u2015\u2212]/g, "-")
    .replace(/\s+/g, "-");

  if (!normalized) {
    throw new Error("Browser ID cannot be empty.");
  }

  if (normalized.length > 64) {
    throw new Error(
      `Browser ID is too long (${normalized.length} characters). Maximum is 64.`
    );
  }

  if (!BROWSER_ID_PATTERN.test(normalized)) {
    const invalid = [
      ...new Set(normalized.match(/[^a-zA-Z0-9_-]/g) ?? []),
    ];
    if (invalid.length > 0) {
      throw new Error(
        `Browser ID contains invalid character(s): ${invalid.join(" ")}. Use letters, digits, underscore, or hyphen only.`
      );
    }
    throw new Error(
      "Browser ID must be 1–64 characters: letters, digits, underscore, or hyphen."
    );
  }

  return normalized;
}

export function isRegisterMessage(
  payload: unknown
): payload is ExtensionRegisterMessage {
  return (
    typeof payload === "object" &&
    payload !== null &&
    (payload as ExtensionRegisterMessage).type === "register" &&
    typeof (payload as ExtensionRegisterMessage).browserId === "string"
  );
}

export function isRegisterAckMessage(
  payload: unknown
): payload is RegisterAckMessage {
  return (
    typeof payload === "object" &&
    payload !== null &&
    (payload as RegisterAckMessage).type === "register-ack"
  );
}
