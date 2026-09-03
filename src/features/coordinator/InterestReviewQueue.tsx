import { useState } from "react";
import type { InterestInvitationResult, InterestReviewQueueProps, InterestReviewStatus, ServeInterestReviewItem } from "./types";

const statusLabels: Record<InterestReviewStatus, string> = {
  new: "New interest",
  "in-conversation": "In conversation",
  invited: "Invitation sent",
  "not-moving-forward": "Not moving forward",
};

const statusClasses: Record<InterestReviewStatus, string> = {
  new: "bg-altar-gold/15 text-altar-ink",
  "in-conversation": "bg-altar-teal/10 text-altar-teal",
  invited: "bg-altar-sage/15 text-altar-ink",
  "not-moving-forward": "bg-altar-stone/65 text-altar-ink/70",
};

function formatSubmittedAt(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function InterestDetails({ item }: { item: ServeInterestReviewItem }) {
  const interests = item.servingInterests?.filter(Boolean) ?? [];
  const availability = item.availability?.filter(Boolean) ?? [];

  return (
    <div className="mt-4 grid gap-4 text-sm leading-6 text-altar-ink/75 sm:grid-cols-2">
      <div>
        <p className="font-semibold text-altar-ink">Ways they hope to serve</p>
        <p className="mt-1">{interests.length > 0 ? interests.join(" · ") : "No preference shared"}</p>
      </div>
      <div>
        <p className="font-semibold text-altar-ink">General availability</p>
        <p className="mt-1">{availability.length > 0 ? availability.join(" · ") : "Not shared"}</p>
      </div>
      {item.note ? (
        <div className="border-l-2 border-altar-gold pl-4 sm:col-span-2">
          <p className="font-semibold text-altar-ink">Their note</p>
          <p className="mt-1">{item.note}</p>
        </div>
      ) : null}
    </div>
  );
}

/**
 * A private coordinator review queue. This component does not access Supabase
 * or make approval decisions; the authenticated coordinator route supplies
 * only the records and actions the current user may handle.
 */
export function InterestReviewQueue({
  items = [],
  isLoading = false,
  onOpenInterest,
  onStartInvitation,
  onMarkNotMovingForward,
}: InterestReviewQueueProps) {
  const [invitationStates, setInvitationStates] = useState<Record<string, "sending" | "failed" | "sent" | "access-activated">>({});
  const [invitationErrors, setInvitationErrors] = useState<Record<string, string>>({});

  const startInvitation = async (item: ServeInterestReviewItem) => {
    if (!onStartInvitation) return;

    setInvitationStates((states) => ({ ...states, [item.id]: "sending" }));
    setInvitationErrors((errors) => {
      const next = { ...errors };
      delete next[item.id];
      return next;
    });

    try {
      const result = await onStartInvitation(item.id) as InterestInvitationResult | void;
      if (result?.outcome === "invitation-sent") {
        setInvitationStates((states) => ({ ...states, [item.id]: "sent" }));
      } else if (result?.outcome === "access-activated") {
        setInvitationStates((states) => ({ ...states, [item.id]: "access-activated" }));
      } else {
        setInvitationStates((states) => {
          const next = { ...states };
          delete next[item.id];
          return next;
        });
      }
    } catch (error) {
      setInvitationStates((states) => ({ ...states, [item.id]: "failed" }));
      setInvitationErrors((errors) => ({
        ...errors,
        [item.id]: error instanceof Error ? error.message : "The invitation could not be sent. Please try again.",
      }));
    }
  };

  return (
    <section aria-labelledby="interest-review-heading" className="bg-white/45 p-6 sm:p-8">
      <div className="flex flex-col gap-4 border-b border-altar-sage/30 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-altar-teal">Coordinator workspace</p>
          <h2 id="interest-review-heading" className="mt-3 font-display text-3xl text-altar-ink">Serving interest review</h2>
          <p className="mt-3 max-w-2xl leading-7 text-altar-ink/75">Review each response before beginning an invitation conversation. A public interest form never grants portal access or reserves a volunteer spot.</p>
        </div>
        <p className="rounded-full bg-altar-stone/55 px-3 py-1.5 text-sm font-semibold text-altar-ink">{isLoading ? "Loading…" : `${items.length} to review`}</p>
      </div>

      {isLoading ? (
        <div aria-busy="true" className="mt-6 space-y-4" aria-live="polite">
          {[0, 1, 2].map((index) => <div className="h-40 animate-pulse bg-altar-stone/35" key={index} />)}
          <p className="sr-only">Loading serving interests.</p>
        </div>
      ) : items.length === 0 ? (
        <div className="mt-6 border-l-2 border-altar-gold bg-altar-parchment/75 p-5">
          <h3 className="font-display text-xl text-altar-teal">The queue is clear.</h3>
          <p className="mt-2 max-w-xl text-sm leading-6 text-altar-ink/75">New interest responses will appear here for a coordinator to review. Nothing is approved automatically.</p>
        </div>
      ) : (
        <ul className="mt-6 space-y-4" aria-label="Serving interest responses">
          {items.map((item) => {
            const invitationState = invitationStates[item.id];
            const invitationError = invitationErrors[item.id];

            return (
              <li className="border border-altar-sage/25 bg-altar-parchment/55 p-5" key={item.id}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="font-display text-2xl text-altar-ink">{item.name}</h3>
                  <a className="focus-ring mt-1 inline-block text-sm text-altar-teal underline decoration-altar-gold decoration-2 underline-offset-4" href={`mailto:${item.email}`}>{item.email}</a>
                  <p className="mt-2 text-xs font-medium uppercase tracking-[0.12em] text-altar-sage">Submitted {formatSubmittedAt(item.submittedAt)}</p>
                </div>
                <span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${statusClasses[item.status]}`}>{statusLabels[item.status]}</span>
              </div>

              <InterestDetails item={item} />

              {invitationState === "sending" ? <p className="mt-5 text-sm font-semibold text-altar-teal" role="status">Sending private invitation…</p> : null}
              {invitationState === "sent" ? <p className="mt-5 border-l-2 border-altar-gold bg-white/60 p-4 text-sm leading-6 text-altar-ink" role="status">Invitation sent to {item.email}. Their private portal access is ready once they use the email link.</p> : null}
              {invitationState === "access-activated" ? <p className="mt-5 border-l-2 border-altar-gold bg-white/60 p-4 text-sm leading-6 text-altar-ink" role="status">This person already has private access. Their serving interest is marked approved; ask them to use the private sign-in page.</p> : null}
              {invitationState === "failed" ? <p className="mt-5 border-l-2 border-altar-gold bg-white/60 p-4 text-sm leading-6 text-altar-ink" role="alert">{invitationError}</p> : null}

              {(onOpenInterest || onStartInvitation || onMarkNotMovingForward) ? (
                <div className="mt-6 flex flex-wrap gap-3 border-t border-altar-sage/20 pt-5">
                  {onOpenInterest && item.status === "new" ? <button className="focus-ring rounded-sm border border-altar-teal px-4 py-2 text-sm font-semibold text-altar-teal transition-colors hover:bg-altar-stone/45" onClick={() => onOpenInterest(item.id)} type="button">Mark as in conversation</button> : null}
                  {onStartInvitation && item.status !== "invited" && item.status !== "not-moving-forward" ? <button className="button-primary" disabled={invitationState === "sending"} onClick={() => void startInvitation(item)} type="button">{invitationState === "sending" ? "Sending invitation…" : invitationState === "failed" ? "Try invitation again" : "Send private invitation"}</button> : null}
                  {onMarkNotMovingForward && item.status !== "not-moving-forward" ? <button className="focus-ring px-2 py-2 text-sm font-semibold text-altar-ink/70 underline decoration-altar-sage underline-offset-4 hover:text-altar-ink" onClick={() => onMarkNotMovingForward(item.id)} type="button">Not moving forward</button> : null}
                </div>
              ) : null}
            </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
