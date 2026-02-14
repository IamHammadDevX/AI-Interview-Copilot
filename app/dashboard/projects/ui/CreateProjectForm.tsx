"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { createProjectAction } from "../actions";

type ActionState = { error: string } | null;

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button className="w-full" type="submit" disabled={pending}>
      {pending ? "Creating..." : "Create"}
    </Button>
  );
}

export default function CreateProjectForm() {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useFormState<ActionState, FormData>(
    createProjectAction,
    null
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" type="button">
          New project
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create project</DialogTitle>
          <DialogDescription>
            Set up a workspace to group documents and context.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="project-name">Name</Label>
            <Input
              id="project-name"
              name="name"
              placeholder="My Interview Prep"
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="project-description">Description</Label>
            <Textarea
              id="project-description"
              name="description"
              placeholder="Optional"
              rows={4}
            />
          </div>

          {state?.error && (
            <Alert className="border-destructive/30">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}

          <SubmitButton />
        </form>
      </DialogContent>
    </Dialog>
  );
}
