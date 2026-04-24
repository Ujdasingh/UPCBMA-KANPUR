/**
 * Super-admin impersonation: when a super_admin sets the `impersonate_as`
 * cookie, every admin request runs with that member's identity for read AND
 * permission purposes. All writes while impersonating log to admin_audit_log
 * with the real actor + the effective (impersonated) identity.
 */

export const IMPERSONATE_COOKIE = "upcbma_impersonate_as";
