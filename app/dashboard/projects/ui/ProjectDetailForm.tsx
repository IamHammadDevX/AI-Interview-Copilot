"use client";

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
    <button className="btn btn-primary" type="submit" disabled={pending}>
      {pending ? "Saving..." : "Save"}
    </button>
  );
}

function DeleteButton() {
  const { pending } = useFormStatus();
  return (
    <button className="btn btn-outline btn-error" type="submit" disabled={pending}>
      {pending ? "Deleting..." : "Delete"}
    </button>
  );
}

export default function ProjectDetailForm({ project }: { project: Project }) {
  const boundUpdate = updateProjectAction.bind(null, project.id);
  const [state, formAction] = useFormState<ActionState, FormData>(boundUpdate, null);

  const boundDelete = deleteProjectAction.bind(null, project.id);

  return (
    <div className="space-y-4">
      <div className="card bg-base-100/80 backdrop-blur shadow-xl border border-base-300 overflow-hidden rounded-3xl">
        <div className="bg-gradient-to-r from-[#FF6B00] to-[#FFA63D] px-6 py-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-white font-semibold text-lg">Project settings</h2>
              <div className="text-white/90 text-sm">Update name and description</div>
            </div>
            <Link className="btn btn-outline border-white/40 text-white hover:bg-white/10" href="/dashboard/projects">
              Back
            </Link>
          </div>
        </div>

        <div className="card-body">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold">Details</h3>
          </div>

          <form action={formAction} className="grid gap-3">
            <label className="form-control">
              <div className="label">
                <span className="label-text">Name</span>
              </div>
              <input
                name="name"
                className="input input-bordered w-full"
                defaultValue={project.name}
                required
              />
            </label>

            <label className="form-control">
              <div className="label">
                <span className="label-text">Description</span>
              </div>
              <textarea
                name="description"
                className="textarea textarea-bordered w-full"
                rows={4}
                defaultValue={project.description ?? ""}
              />
            </label>

            {state?.error && (
              <div className="alert alert-error">
                <span>{state.error}</span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="text-xs opacity-60">
                Created {new Date(project.created_at).toLocaleString()}
              </div>
              <SaveButton />
            </div>
          </form>
        </div>
      </div>

      <div className="card bg-base-100/80 backdrop-blur shadow-xl border border-base-300 rounded-3xl">
        <div className="card-body">
          <h2 className="card-title text-error">Danger zone</h2>
          <div className="text-sm opacity-70">
            Deleting a project is permanent.
          </div>
          <form action={boundDelete}>
            <DeleteButton />
          </form>
        </div>
      </div>
    </div>
  );
}
