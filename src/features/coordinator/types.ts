export type InterestReviewStatus = "new" | "in-conversation" | "invited" | "not-moving-forward";

/**
 * Coordinator-safe information collected through the public serve-interest
 * form. It intentionally represents interest, not a volunteer account or a
 * scheduled commitment.
 */
export interface ServeInterestReviewItem {
  id: string;
  name: string;
  email: string;
  submittedAt: string;
  availability?: string[];
  servingInterests?: string[];
  note?: string | null;
  status: InterestReviewStatus;
}

export interface InterestReviewQueueProps {
  items?: ServeInterestReviewItem[];
  isLoading?: boolean;
  /** Opens the coordinator-owned follow-up conversation for this interest. */
  onOpenInterest?: (interestId: string) => void;
  /**
   * Starts the private invitation workflow. This is never a public signup or
   * automatic volunteer approval action.
   */
  onStartInvitation?: (interestId: string) => void;
  /** Records that this interest will not move forward right now. */
  onMarkNotMovingForward?: (interestId: string) => void;
}

export interface CoordinationAttentionItem {
  id: string;
  title: string;
  description: string;
  severity: "needs-attention" | "watch";
}

export interface CoordinationOverviewData {
  periodLabel: string;
  prayerFocusTitle?: string;
  upcomingGatherings: number;
  openVolunteerSlots: number;
  scheduledVolunteerSlots: number;
  pendingInterests: number;
  attentionItems?: CoordinationAttentionItem[];
}

export interface CoordinationOverviewProps {
  data?: CoordinationOverviewData;
  isLoading?: boolean;
  onOpenSchedule?: () => void;
  onReviewInterests?: () => void;
}
