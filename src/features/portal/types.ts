/**
 * Navigation is intentionally supplied by the integrating route. The portal
 * feature does not decide where authenticated users are sent or how support is
 * handled.
 */
export interface PortalLink {
  href: string;
  label: string;
}

export interface VolunteerPortalEmptyStateProps {
  /** A first name or other preferred greeting supplied by the authenticated shell. */
  volunteerName?: string;
  /** Optional context such as "September 1–7"; no schedule data is required. */
  periodLabel?: string;
  availableSlotsLink?: PortalLink;
  supportLink?: PortalLink;
}

export interface PortalAccessDeniedProps {
  /** A public serving-interest or support destination. */
  requestAccessLink?: PortalLink;
  supportLink?: PortalLink;
  signOutLink?: PortalLink;
}
