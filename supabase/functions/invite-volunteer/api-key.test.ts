import { describe, expect, it } from "vitest";
import { projectApiKey } from "./api-key";

describe("projectApiKey", () => {
  it("uses the current named key set before its legacy fallback", () => {
    expect(projectApiKey({ SUPABASE_SECRET_KEYS: '{"default":"current-key"}', SUPABASE_SERVICE_ROLE_KEY: "legacy-key" }, "SUPABASE_SECRET_KEYS", "SUPABASE_SERVICE_ROLE_KEY")).toBe("current-key");
  });

  it("falls back when a current key set is absent or malformed", () => {
    expect(projectApiKey({ SUPABASE_SERVICE_ROLE_KEY: "legacy-key" }, "SUPABASE_SECRET_KEYS", "SUPABASE_SERVICE_ROLE_KEY")).toBe("legacy-key");
    expect(projectApiKey({ SUPABASE_SECRET_KEYS: "not-json", SUPABASE_SERVICE_ROLE_KEY: "legacy-key" }, "SUPABASE_SECRET_KEYS", "SUPABASE_SERVICE_ROLE_KEY")).toBe("legacy-key");
  });
});
