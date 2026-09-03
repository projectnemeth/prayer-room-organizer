export type InvitationCaller = {
  role: string;
  status: string;
};

/** Active coordinators and administrators may issue volunteer invitations. */
export function canSendVolunteerInvitation(caller: InvitationCaller | null): boolean {
  if (!caller || caller.status !== "active") return false;
  return caller.role === "coordinator" || caller.role === "admin";
}
