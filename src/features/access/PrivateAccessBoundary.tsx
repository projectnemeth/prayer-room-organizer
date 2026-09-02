import { useEffect, useState, type ReactNode } from "react";
import { PortalAccessDenied } from "../portal";
import { getSupabaseBrowserClient, hasSupabaseBrowserConfig, signOutPrivateSession } from "../../lib/supabase";

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
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

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

  const signOut = async () => {
    setIsSigningOut(true);
    setSignOutError(null);
    try {
      await signOutPrivateSession(getSupabaseBrowserClient());
      window.location.assign("/access");
    } catch (error) {
      setSignOutError(error instanceof Error ? error.message : "We could not sign you out on this device. Please try again.");
      setIsSigningOut(false);
    }
  };

  return (
    <div className="relative">
      <div className="absolute right-6 top-3 z-10 flex items-center gap-3 sm:right-10 lg:right-16">
        <span className="hidden text-xs font-medium text-altar-sage sm:inline">Signed in as {access.profile.displayName || "team member"}</span>
        <button className="focus-ring text-xs font-semibold text-altar-teal underline decoration-altar-gold decoration-2 underline-offset-4" disabled={isSigningOut} onClick={() => void signOut()} type="button">
          {isSigningOut ? "Signing out…" : "Sign out"}
        </button>
      </div>
      {signOutError ? <p className="absolute left-6 right-6 top-12 z-10 border-l-2 border-altar-gold bg-white/90 p-3 text-sm text-altar-ink sm:left-auto sm:right-10 sm:w-96 lg:right-16" role="alert">{signOutError}</p> : null}
      {children(access.profile)}
    </div>
  );
}
