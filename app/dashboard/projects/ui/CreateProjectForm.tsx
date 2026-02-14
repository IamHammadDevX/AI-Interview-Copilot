"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createProjectAction } from "../actions";
import { useRef } from "react";

type ActionState = { error: string } | null;

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button className="btn btn-primary w-full" type="submit" disabled={pending}>
      {pending ? "Creating..." : "Create"}
    </button>
  );
}

export default function CreateProjectForm() {
  const modalRef = useRef<HTMLDialogElement | null>(null);
  const [state, formAction] = useFormState<ActionState, FormData>(
    createProjectAction,
    null
  );

  return (
    <>
      <button
        className="btn btn-outline"
        onClick={() => modalRef.current?.showModal()}
        type="button"
      >
        New project
      </button>

      <dialog ref={modalRef} className="modal">
        <div className="modal-box w-11/12 max-w-lg rounded-2xl border border-base-300">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Create project</h2>
              <p className="text-sm opacity-70">
                Set up a workspace to group documents and context.
              </p>
            </div>
            <form method="dialog">
              <button className="btn btn-ghost btn-sm" aria-label="Close">
                ✕
              </button>
            </form>
          </div>

          <form action={formAction} className="grid gap-3 mt-4">
            <label className="form-control">
              <div className="label">
                <span className="label-text">Name</span>
              </div>
              <input
                name="name"
                className="input input-bordered w-full"
                placeholder="My Interview Prep"
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
                placeholder="Optional"
                rows={4}
              />
            </label>

            {state?.error && (
              <div className="alert alert-error">
                <span>{state.error}</span>
              </div>
            )}

            <div className="pt-1">
              <SubmitButton />
            </div>
          </form>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>
    </>
  );
}
