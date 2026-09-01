import { describe, expect, it } from "vitest";
import { getSupabaseBrowserConfig, hasSupabaseBrowserConfig } from "./config";

describe("Supabase browser configuration", () => {
  it("trims and returns the two browser-safe settings", () => {
    expect(getSupabaseBrowserConfig({
      VITE_SUPABASE_URL: " https://example.supabase.co/ ",
      VITE_SUPABASE_ANON_KEY: " public-anon-key ",
    })).toEqual({
      url: "https://example.supabase.co/",
      anonKey: "public-anon-key",
    });
  });

  it("does not report a partial configuration as ready", () => {
    expect(hasSupabaseBrowserConfig({ VITE_SUPABASE_URL: "https://example.supabase.co" })).toBe(false);
  });

  it("explains when a required setting is missing or malformed", () => {
    expect(() => getSupabaseBrowserConfig({ VITE_SUPABASE_ANON_KEY: "key" })).toThrow("VITE_SUPABASE_URL");
    expect(() => getSupabaseBrowserConfig({
      VITE_SUPABASE_URL: "not a URL",
      VITE_SUPABASE_ANON_KEY: "key",
    })).toThrow("valid absolute URL");
  });
});
