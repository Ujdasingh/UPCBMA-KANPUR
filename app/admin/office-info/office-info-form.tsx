"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import type { OfficeInfo } from "@/lib/db-types";
import { useState } from "react";
import { saveOfficeInfo } from "./actions";

export function OfficeInfoForm({ info }: { info: OfficeInfo | null }) {
  const [saved, setSaved] = useState(false);

  async function action(formData: FormData) {
    await saveOfficeInfo(formData);
    setSaved(true);
    // Clear the confirmation after a moment.
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <form action={action} className="space-y-6">
      <Card>
        <h2 className="mb-4 text-sm font-semibold text-heading">
          Contact details
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Office phone" htmlFor="phone">
            <Input
              id="phone"
              name="phone"
              type="tel"
              defaultValue={info?.phone ?? ""}
              placeholder="+91 512 xxx xxxx"
            />
          </Field>
          <Field label="Lab phone" htmlFor="lab_phone">
            <Input
              id="lab_phone"
              name="lab_phone"
              type="tel"
              defaultValue={info?.lab_phone ?? ""}
            />
          </Field>
          <Field label="Email" htmlFor="email">
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={info?.email ?? ""}
              placeholder="info@upcbmakanpur.in"
            />
          </Field>
          <div />
          <div className="col-span-2">
            <Field label="Address" htmlFor="address">
              <Textarea
                id="address"
                name="address"
                rows={3}
                defaultValue={info?.address ?? ""}
                placeholder="1st Floor, IIA Bhawan, Dada Nagar, Kanpur…"
              />
            </Field>
          </div>
          <div className="col-span-2">
            <Field
              label="Hours"
              htmlFor="hours"
              hint="Free-form, e.g. 'Mon–Fri 10:00–18:00 · Sat 10:00–14:00 · Sun Closed'"
            >
              <Textarea
                id="hours"
                name="hours"
                rows={3}
                defaultValue={info?.hours ?? ""}
              />
            </Field>
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 text-sm font-semibold text-heading">
          Lab desk
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Contact name" htmlFor="lab_contact_name">
            <Input
              id="lab_contact_name"
              name="lab_contact_name"
              defaultValue={info?.lab_contact_name ?? ""}
              placeholder="Ankit"
            />
          </Field>
          <Field label="Contact role" htmlFor="lab_contact_role">
            <Input
              id="lab_contact_role"
              name="lab_contact_role"
              defaultValue={info?.lab_contact_role ?? ""}
              placeholder="Lab Assistant"
            />
          </Field>
          <div className="col-span-2">
            <Field
              label="Billing model"
              htmlFor="lab_billing_model"
              hint="Appears on the public Lab page."
            >
              <Input
                id="lab_billing_model"
                name="lab_billing_model"
                defaultValue={info?.lab_billing_model ?? ""}
                placeholder="Free for members on coupon system"
              />
            </Field>
          </div>
        </div>
      </Card>

      <div className="flex items-center justify-end gap-3">
        {saved && (
          <span className="text-xs text-success">Saved.</span>
        )}
        <Button type="submit">Save changes</Button>
      </div>
    </form>
  );
}
