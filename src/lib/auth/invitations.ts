import type { User } from "@supabase/supabase-js";

export const invitationExpirySeconds = Math.max(
  60,
  Number(process.env.SUPABASE_INVITE_EXPIRY_SECONDS) || 86_400,
);

export function invitationMetadata(displayName: string) {
  const sentAt = new Date();
  return {
    display_name: displayName,
    password_setup_required: true,
    invitation_sent_at: sentAt.toISOString(),
    invitation_expires_at: new Date(sentAt.getTime() + invitationExpirySeconds * 1000).toISOString(),
  };
}

export function invitationExpiresAt(user: User) {
  const explicit = user.user_metadata.invitation_expires_at;
  if (typeof explicit === "string" && !Number.isNaN(Date.parse(explicit))) return explicit;
  const sentAt = user.confirmation_sent_at || user.invited_at || user.created_at;
  return new Date(new Date(sentAt).getTime() + invitationExpirySeconds * 1000).toISOString();
}

export function invitationIsExpired(expiresAt: string) {
  return Date.parse(expiresAt) <= Date.now();
}
