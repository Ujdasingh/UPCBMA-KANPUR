"use client";

import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { signOut } from "@/app/admin/actions";

export function SignOutButton() {
  return (
    <form action={signOut}>
      <Button variant="ghost" size="sm" type="submit">
        <LogOut className="h-4 w-4" strokeWidth={1.75} />
        Sign out
      </Button>
    </form>
  );
}
