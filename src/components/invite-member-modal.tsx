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
import { PlusIcon } from "lucide-react";

interface InviteMemberModalProps {
  orgId: string;
  orgRoles: { id: string; name: string }[];
  teams: { id: string; name: string }[];
  teamRolesMap: Record<string, { id: string; name: string }[]>;
}

export function InviteMemberModal({
  orgId,
  orgRoles,
  teams,
  teamRolesMap,
}: InviteMemberModalProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default">
          <PlusIcon className="mr-2 h-4 w-4" />
          Invite Member
        </Button>
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
