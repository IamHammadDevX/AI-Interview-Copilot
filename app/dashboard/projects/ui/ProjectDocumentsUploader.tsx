"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

type DocRow = {
  id: string;
  file_name: string;
  status: "uploaded" | "processing" | "ready" | "error";
  created_at: string;
  error: string | null;
};

export default function ProjectDocumentsUploader({
  projectId,
  initialDocuments,
}: {
  projectId: string;
  initialDocuments: DocRow[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const count = initialDocuments.length;

  const accept = useMemo(
    () =>
      [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain",
        ".pdf",
        ".docx",
        ".txt",
      ].join(","),
    []
  );

  const upload = async () => {
    if (!file) return;
    setError(null);
    setIsUploading(true);

    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch(`/api/projects/${projectId}/upload`, {
        method: "POST",
        body: fd,
      });

      const data = (await res.json().catch(() => null)) as any;
      if (!res.ok) {
        setError(data?.error ?? "Upload failed");
        return;
      }

      setFile(null);
      startTransition(() => {
        router.refresh();
      });
    } catch (e: any) {
      setError(typeof e?.message === "string" ? e.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card/70 backdrop-blur shadow-sm">
      <div className="p-5 flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">Project documents</div>
            <div className="text-xs text-muted-foreground mt-1">
              Upload up to 10 documents (PDF, DOCX, TXT). Files are stored privately.
            </div>
          </div>
          <div className="text-xs text-muted-foreground">{count}/10</div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            type="file"
            accept={accept}
            disabled={isUploading || isPending || count >= 10}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <Button
            onClick={upload}
            disabled={!file || isUploading || isPending || count >= 10}
          >
            {isUploading ? "Uploading…" : "Upload"}
          </Button>
        </div>

        {error && (
          <div className="text-sm text-destructive border border-destructive/30 bg-destructive/10 rounded-xl p-3">
            {error}
          </div>
        )}

        <div className="border-t border-border pt-4">
          <div className="grid gap-2">
            {initialDocuments.length === 0 ? (
              <div className="text-sm text-muted-foreground">No documents uploaded yet.</div>
            ) : (
              initialDocuments.map((d) => (
                <div
                  key={d.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-xl border border-border bg-background/60 p-3"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{d.file_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(d.created_at).toLocaleString()}
                      {d.status === "error" && d.error ? ` · ${d.error}` : ""}
                    </div>
                  </div>
                  <div
                    className={`text-xs px-2 py-1 rounded-full border w-fit ${
                      d.status === "ready"
                        ? "border-emerald-300/60 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                        : d.status === "processing"
                          ? "border-blue-300/60 bg-blue-500/10 text-blue-700 dark:text-blue-300"
                          : d.status === "error"
                            ? "border-red-300/60 bg-red-500/10 text-red-700 dark:text-red-300"
                            : "border-border bg-muted/40 text-muted-foreground"
                    }`}
                  >
                    {d.status}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

