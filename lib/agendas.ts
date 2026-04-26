export type AgendaStatus = "active" | "on_hold" | "resolved" | "archived";
export type AgendaPriority = "high" | "medium" | "low";
export type AgendaApproval = "pending" | "approved" | "rejected" | "changes_requested";

export type Agenda = {
  id: string;
  slug: string;
  chapter_id: string | null;
  category: string;
  status: AgendaStatus;
  priority: AgendaPriority;
  visibility: "public" | "members_only";
  approval_status: AgendaApproval;
  required_approvals: number;
  title: string;
  summary: string | null;
  body: string | null;
  image_url: string | null;
  started_on: string;
  target_resolution_on: string | null;
  resolved_on: string | null;
  created_by: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AgendaUpdate = {
  id: string;
  agenda_id: string;
  type: string;
  title: string;
  body: string | null;
  posted_at: string;
  posted_by: string | null;
};

export type AgendaComment = {
  id: string;
  agenda_id: string;
  member_id: string;
  parent_id: string | null;
  body: string;
  posted_at: string;
  hidden: boolean;
};

export const AGENDA_CATEGORIES = [
  { value: "gas",         label: "Gas / LPG"        },
  { value: "paper",       label: "Paper rates"      },
  { value: "supply",      label: "Supply chain"     },
  { value: "regulation",  label: "Regulation / GST" },
  { value: "labour",      label: "Labour"           },
  { value: "environment", label: "Environment"      },
  { value: "policy",      label: "Policy"           },
  { value: "other",       label: "Other"            },
] as const;

export const AGENDA_STATUS = [
  { value: "active",    label: "Active"    },
  { value: "on_hold",   label: "On hold"   },
  { value: "resolved",  label: "Resolved"  },
  { value: "archived",  label: "Archived"  },
] as const;

export const AGENDA_PRIORITY = [
  { value: "high",   label: "High"   },
  { value: "medium", label: "Medium" },
  { value: "low",    label: "Low"    },
] as const;

export const APPROVAL_STATUS = [
  { value: "pending",            label: "Pending review" },
  { value: "approved",           label: "Approved"       },
  { value: "rejected",           label: "Rejected"       },
  { value: "changes_requested",  label: "Changes requested" },
] as const;

export const UPDATE_TYPES = [
  { value: "update",              label: "Update"              },
  { value: "meeting",             label: "Meeting held"        },
  { value: "letter",              label: "Letter sent"         },
  { value: "government_response", label: "Government response" },
  { value: "media",               label: "Media coverage"      },
  { value: "milestone",           label: "Milestone"           },
  { value: "resolution",          label: "Resolution"          },
] as const;

export function statusTone(s: AgendaStatus) {
  switch (s) {
    case "active":   return "bg-emerald-50 text-emerald-900 border-emerald-200";
    case "on_hold":  return "bg-amber-50 text-amber-900 border-amber-200";
    case "resolved": return "bg-blue-50 text-blue-900 border-blue-200";
    case "archived": return "bg-surface text-muted border-border";
    default:         return "bg-surface text-muted border-border";
  }
}

export function approvalTone(a: AgendaApproval) {
  switch (a) {
    case "pending":           return "bg-amber-50 text-amber-900 border-amber-200";
    case "approved":          return "bg-emerald-50 text-emerald-900 border-emerald-200";
    case "rejected":          return "bg-red-50 text-red-900 border-red-200";
    case "changes_requested": return "bg-blue-50 text-blue-900 border-blue-200";
    default:                  return "bg-surface text-muted border-border";
  }
}

export function priorityTone(p: AgendaPriority) {
  switch (p) {
    case "high":   return "bg-red-50 text-red-900 border-red-200";
    case "medium": return "bg-amber-50 text-amber-900 border-amber-200";
    case "low":    return "bg-surface text-muted border-border";
  }
}

export function categoryLabel(c: string) {
  return AGENDA_CATEGORIES.find((x) => x.value === c)?.label ?? c;
}

export function slugifyAgenda(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
