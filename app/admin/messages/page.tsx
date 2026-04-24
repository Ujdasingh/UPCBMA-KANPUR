import { PageHeader } from "@/components/admin/page-header";
import { createClient } from "@/lib/supabase/server";
import { MessagesTable } from "./messages-table";

export const dynamic = "force-dynamic";
export const metadata = { title: "Messages — UPCBMA Admin" };

export default async function MessagesPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contact_messages")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <>
        <PageHeader title="Messages" />
        <p className="text-sm text-danger">
          Failed to load messages: {error.message}
        </p>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Messages"
        description="Inbox for the public contact form."
      />
      <MessagesTable rows={data ?? []} />
    </>
  );
}
