import { describe, expect, it } from "vitest";
import { sanitizeForLog } from "../src/utils/logger";

describe("sanitizeForLog", () => {
  it("redacts sensitive keys recursively", () => {
    const sanitized = sanitizeForLog({
      access_token: "abc",
      nested: {
        client_secret: "secret",
        headers: {
          Authorization: "Bearer eyJabc"
        }
      },
      arr: [{ token: "123" }]
    });

    expect(sanitized).toEqual({
      access_token: "[REDACTED]",
      nested: {
        client_secret: "[REDACTED]",
        headers: {
          Authorization: "[REDACTED]"
        }
      },
      arr: [{ token: "[REDACTED]" }]
    });
  });

  it("redacts bearer strings outside sensitive keys", () => {
    expect(sanitizeForLog({ message: "Authorization: Bearer eyJabc.def" })).toEqual({
      message: "Authorization: Bearer [REDACTED]"
    });
  });

  it("does not break on circular objects", () => {
    const value: Record<string, unknown> = { ok: true };
    value.self = value;

    expect(sanitizeForLog(value)).toEqual({
      ok: true,
      self: "[Circular]"
    });
  });
});
