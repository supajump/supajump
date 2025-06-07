"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import InviteMemberForm from "./invite-member-form";

interface InviteMemberDialogProps {
  orgId: string;
  orgRoles: { id: string; name: string }[];
  teams: { id: string; name: string }[];
  teamRolesMap: Record<string, { id: string; name: string }[]>;
}

export default function InviteMemberDialog({
  orgId,
  orgRoles,
  teams,
  teamRolesMap,
}: InviteMemberDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default">Invite Member</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Invite Member</DialogTitle>
        </DialogHeader>
        <InviteMemberForm
          orgId={orgId}
          orgRoles={orgRoles}
          teams={teams}
          teamRolesMap={teamRolesMap}
        />
      </DialogContent>
    </Dialog>
  );
}
