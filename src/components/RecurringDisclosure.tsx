"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface RecurringDisclosureProps {
  agreed: boolean;
  onAgreeChange: (agreed: boolean) => void;
}

const RecurringDisclosure: React.FC<RecurringDisclosureProps> = ({ agreed, onAgreeChange }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">View Recurring Charge Authorization</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Recurring Charge Authorization Disclosure</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                By subscribing, you authorize recurring charges to your selected payment method
                for the plan price and billing interval you choose. Charges will continue until
                you cancel. You may cancel anytime before the next billing date through your
                billing portal. Partial periods are not prorated. You are responsible for
                maintaining valid payment details. Failed payments may suspend service.
              </p>
              <p>
                Refunds follow our policy. Taxes may apply. Your use of the service is subject
                to our Terms of Service and Privacy Policy.
              </p>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={agreed} onCheckedChange={(v) => onAgreeChange(Boolean(v))} />
        <span>I have read and agree to the recurring charge authorization.</span>
      </label>
    </div>
  );
};

export default RecurringDisclosure;