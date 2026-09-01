import { useEffect, useState, type ReactNode } from "react";
import { PortalAccessDenied } from "../portal";
import { getSupabaseBrowserClient, hasSupabaseBrowserConfig } from "../../lib/supabase";

export type PrivateProfileRole = "volunteer" | "coordinator" | "admin";

export interface ActivePrivateProfile {
  id: string;
  displayName: string;
  role: PrivateProfileRole;
}

type AccessState =
  | { kind: "loading" }
  | { kind: "allowed"; profile: ActivePrivateProfile }
  | { kind: "denied" };

interface PrivateAccessBoundaryProps {
  children: (profile: ActivePrivateProfile) => ReactNode;
  requireCoordinator?: boolean;
}

function AccessLoadingState() {
  return (
    <main className="grid min-h-full place-items-center bg-altar-parchment px-6 py-14 text-altar-ink">
      <p aria-live="polite" className="text-sm text-altar-sage">Checking private portal access…</p>
    </main>
  );
}

/**
 * A browser-side convenience boundary only. Supabase Auth, RLS, and the
 * database policies remain the authority for every private query.
 */
export function PrivateAccessBoundary({ children, requireCoordinator = false }: PrivateAccessBoundaryProps) {
  const [access, setAccess] = useState<AccessState>({ kind: "loading" });

  useEffect(() => {
    let active = true;

    async function resolveAccess() {
      if (!hasSupabaseBrowserConfig(import.meta.env)) {
        if (active) setAccess({ kind: "denied" });
        return;
      }

      const client = getSupabaseBrowserClient();
      const { data: userData, error: userError } = await client.auth.getUser();
      if (userError || !userData.user) {
        if (active) setAccess({ kind: "denied" });
        return;
      }

      const { data: profile, error: profileError } = await client
        .from("profiles")
        .select("id, display_name, role, status")
        .eq("id", userData.user.id)
        .maybeSingle();

      if (
        profileError
        || !profile
        || profile.status !== "active"
        || !["volunteer", "coordinator", "admin"].includes(profile.role)
      ) {
        if (active) setAccess({ kind: "denied" });
        return;
      }

      const privateProfile: ActivePrivateProfile = {
        id: profile.id,
        displayName: profile.display_name,
        role: profile.role as PrivateProfileRole,
      };

      if (requireCoordinator && privateProfile.role === "volunteer") {
        if (active) setAccess({ kind: "denied" });
        return;
      }

      if (active) setAccess({ kind: "allowed", profile: privateProfile });
    }

    void resolveAccess();
    return () => { active = false; };
  }, [requireCoordinator]);

  if (access.kind === "loading") return <AccessLoadingState />;
  if (access.kind === "denied") {
    return <PortalAccessDenied requestAccessLink={{ href: "/serve", label: "Share your interest" }} supportLink={{ href: "/access", label: "Sign in" }} />;
  }

  return <>{children(access.profile)}</>;
}
