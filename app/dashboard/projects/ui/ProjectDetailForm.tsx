"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { deleteProjectAction, updateProjectAction } from "../actions";

type Project = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
};

type ActionState = { error: string } | null;

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving..." : "Save"}
    </Button>
  );
}

export default function ProjectDetailForm({ project }: { project: Project }) {
  const boundUpdate = updateProjectAction.bind(null, project.id);
  const [state, formAction] = useFormState<ActionState, FormData>(boundUpdate, null);

  const boundDelete = deleteProjectAction.bind(null, project.id);

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden bg-card/80 backdrop-blur">
        <div className="bg-gradient-to-r from-[#FF6B00] to-[#FFA63D] px-6 py-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-white font-semibold text-lg">Project settings</h2>
              <div className="text-white/90 text-sm">Update name and description</div>
            </div>
            <Button asChild variant="outline" className="border-white/40 text-white hover:bg-white/10">
              <Link href="/dashboard/projects">Back</Link>
            </Button>
          </div>
        </div>

        <CardContent className="p-6">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold">Details</h3>
          </div>

          <form action={formAction} className="grid gap-4 mt-3">
            <div className="grid gap-2">
              <Label htmlFor="project-name">Name</Label>
              <Input id="project-name" name="name" defaultValue={project.name} required />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="project-description">Description</Label>
              <Textarea
                id="project-description"
                name="description"
                rows={4}
                defaultValue={project.description ?? ""}
              />
            </div>

            {state?.error && (
              <Alert className="border-destructive/30">
                <AlertDescription>{state.error}</AlertDescription>
              </Alert>
            )}

            <div className="flex items-center justify-between gap-3">
              <div className="text-xs text-muted-foreground">
                Created {new Date(project.created_at).toLocaleString()}
              </div>
              <SaveButton />
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="bg-card/80 backdrop-blur">
        <CardContent className="p-6 space-y-3">
          <div>
            <div className="text-base font-semibold text-destructive">Danger zone</div>
            <div className="text-sm text-muted-foreground mt-1">
              Deleting a project is permanent.
            </div>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">Delete project</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this project?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <form action={boundDelete}>
                  <PendingDeleteAction />
                </form>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}

function PendingDeleteAction() {
  const { pending } = useFormStatus();
  return (
    <AlertDialogAction type="submit" disabled={pending}>
      {pending ? "Deleting..." : "Delete"}
    </AlertDialogAction>
  );
}
