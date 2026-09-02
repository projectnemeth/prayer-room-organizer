import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

interface UpdateSubscriptionTokenPageProps {
  action: (token: string) => Promise<boolean>;
  kind: "confirm" | "unsubscribe";
}

export function UpdateSubscriptionTokenPage({ action, kind }: UpdateSubscriptionTokenPageProps) {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [state, setState] = useState<"working" | "success" | "expired" | "error">(() => token ? "working" : "expired");

  useEffect(() => {
    if (!token) return;
    let active = true;
    action(token)
      .then((succeeded) => { if (active) setState(succeeded ? "success" : "expired"); })
      .catch(() => { if (active) setState("error"); });
    return () => { active = false; };
  }, [action, token]);

  const content = kind === "confirm"
    ? {
      success: ["You’re subscribed", "Your email is confirmed. You’ll receive Altar Initiative gathering updates and daily prayer focuses."],
      expired: ["This confirmation link is no longer active", "Request another confirmation email to subscribe to updates."],
      error: ["We couldn’t confirm this right now", "Please try the link again in a moment, or request a new confirmation email."],
    }
    : {
      success: ["Your unsubscribe request was processed", "If this link was active, you will no longer receive Altar Initiative email updates."],
      expired: ["This unsubscribe link is no longer active", "You can safely close this page."],
      error: ["We couldn’t process this right now", "Please try the link again in a moment."],
    };
  const [title, body] = state === "working"
    ? ["One moment…", "We’re securely processing your request."]
    : content[state];

  return <main className="min-h-full bg-[#F5F1E8] px-6 py-14 text-[#1F2421] sm:px-10 lg:px-16"><div aria-live="polite" className="mx-auto max-w-2xl border-t-2 border-[#B99A61] bg-white/50 p-8"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#3F5F5B]">The Altar Initiative</p><h1 className="mt-4 font-serif text-4xl">{title}</h1><p className="mt-5 leading-8 text-[#1F2421]/80">{body}</p></div></main>;
}
