"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

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
  const [documents, setDocuments] = useState<DocRow[]>(initialDocuments);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<
    "idle" | "uploading" | "processing" | "ready" | "error"
  >("idle");
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);
  const pollTimerRef = useRef<number | null>(null);
  const lastProgressRef = useRef(0);

  useEffect(() => {
    setDocuments(initialDocuments);
  }, [initialDocuments]);

  const count = documents.length;

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

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) window.clearInterval(pollTimerRef.current);
    };
  }, []);

  const startPollingStatus = (documentId: string): void => {
    if (pollTimerRef.current) window.clearInterval(pollTimerRef.current);

    pollTimerRef.current = window.setInterval(async (): Promise<void> => {
      try {
        const res = await fetch(
          `/api/projects/${projectId}/documents/${documentId}`
        );
        if (!res.ok) return;
        const data = await res
          .json()
          .catch((): null => null) as null | {
          status?: "uploaded" | "processing" | "ready" | "error";
          error?: string | null;
        };
        const status = data?.status;

        if (status === "ready") {
          setPhase("ready");
          setProgress(100);
          if (pollTimerRef.current) window.clearInterval(pollTimerRef.current);
          pollTimerRef.current = null;
          startTransition(() => router.refresh());
          return;
        }

        if (status === "error") {
          setPhase("error");
          setProgress(100);
          setError(data?.error ?? "Ingestion failed");
          if (pollTimerRef.current) window.clearInterval(pollTimerRef.current);
          pollTimerRef.current = null;
          startTransition(() => router.refresh());
          return;
        }

        setPhase("processing");
        setProgress((p) => {
          const base = Math.max(p, 70);
          const next = Math.min(95, base + 2);
          lastProgressRef.current = next;
          return next;
        });
      } catch {
        // ignore
      }
    }, 1200);
  };

  const upload = async (): Promise<void> => {
    if (!file) return;
    setError(null);
    setIsUploading(true);
    setPhase("uploading");
    setProgress(1);
    lastProgressRef.current = 1;

    try {
      const fd = new FormData();
      fd.append("file", file);

      const documentId = await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `/api/projects/${projectId}/upload`, true);

        xhr.upload.onprogress = (evt) => {
          if (!evt.lengthComputable) return;
          const pct = Math.max(1, Math.min(65, Math.round((evt.loaded / evt.total) * 65)));
          lastProgressRef.current = pct;
          setProgress(pct);
        };

        xhr.onerror = () => reject(new Error("Upload failed"));
        xhr.onload = () => {
          try {
            const json = JSON.parse(xhr.responseText || "{}");
            if (xhr.status >= 200 && xhr.status < 300 && json?.success && json?.documentId) {
              resolve(json.documentId as string);
              return;
            }
            reject(new Error(json?.error ?? "Upload failed"));
          } catch {
            reject(new Error("Upload failed"));
          }
        };

        xhr.send(fd);
      });

      setActiveDocumentId(documentId);
      setPhase("processing");
      setProgress((p) => Math.max(p, 70));
      setFile(null);
      startTransition(() => router.refresh());
      startPollingStatus(documentId);
    } catch (e: any) {
      setError(typeof e?.message === "string" ? e.message : "Upload failed");
      setPhase("error");
    } finally {
      setIsUploading(false);
    }
  };

  const deleteDocument = async (doc: DocRow): Promise<void> => {
    if (doc.status === 'processing') {
      setError('Document is processing. Please wait until it finishes.')
      return
    }
    const ok = window.confirm(`Delete "${doc.file_name}"? This cannot be undone.`)
    if (!ok) return

    setError(null)
    try {
      const res = await fetch(
        `/api/projects/${projectId}/documents/${doc.id}`,
        { method: 'DELETE' }
      )
      const data = await res
        .json()
        .catch((): null => null) as null | { error?: string }
      if (!res.ok) {
        setError(data?.error ?? 'Failed to delete document')
        return
      }

      setDocuments((prev) => prev.filter((d) => d.id !== doc.id))
      startTransition(() => router.refresh())
    } catch (e: any) {
      setError(typeof e?.message === 'string' ? e.message : 'Failed to delete document')
    }
  }

  const showProgress = phase !== "idle";
  const progressBarClass =
    phase === "error"
      ? "bg-destructive"
      : phase === "ready"
        ? "bg-emerald-500"
        : "bg-primary";

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

        {showProgress && (
          <div className="rounded-xl border border-border bg-background/60 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-medium">
                {phase === "uploading"
                  ? "Uploading…"
                  : phase === "processing"
                    ? "Processing… generating embeddings"
                    : phase === "ready"
                      ? "Ready"
                      : "Failed"}
              </div>
              <div className="text-xs text-muted-foreground">
                {activeDocumentId ? `Doc ${activeDocumentId.slice(0, 8)}…` : ""}
              </div>
            </div>

            <div className="mt-2 h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full ${progressBarClass} transition-all duration-300`}
                style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
              />
            </div>

            <div className="mt-2 text-xs text-muted-foreground">
              {phase === "processing"
                ? "This may take ~10–30 seconds depending on document size."
                : phase === "ready"
                  ? "Document indexed and ready for questions."
                  : phase === "error"
                    ? "Upload or indexing failed. See error below."
                    : ""}
            </div>
          </div>
        )}

        {error && (
          <div className="text-sm text-destructive border border-destructive/30 bg-destructive/10 rounded-xl p-3">
            {error}
          </div>
        )}

        <div className="border-t border-border pt-4">
          <div className="grid gap-2">
            {documents.length === 0 ? (
              <div className="text-sm text-muted-foreground">No documents uploaded yet.</div>
            ) : (
              documents.map((d) => (
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
                  <div className="flex items-center gap-2">
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
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      disabled={isUploading || isPending || d.status === 'processing'}
                      onClick={() => deleteDocument(d)}
                    >
                      Delete
                    </Button>
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
