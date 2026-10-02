"use client";

import { useCallback, useState, useTransition } from "react";
import { useDropzone } from "react-dropzone";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { saveSubmission } from "@/app/groups/actions";

type Uploaded = { url: string; fileName: string; fileSize: number };

export default function SubmissionForm({
  groupId,
  assignmentId,
  initialText,
  initialStatus,
  initialAttachments,
  readOnly,
}: {
  groupId: string;
  assignmentId: string;
  initialText: string | null;
  initialStatus: string;
  initialAttachments: { id: string; fileUrl: string; fileName: string | null }[];
  readOnly: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [text, setText] = useState(initialText ?? "");
  const [files, setFiles] = useState<Uploaded[]>(
    initialAttachments.map((a) => ({ url: a.fileUrl, fileName: a.fileName ?? "file", fileSize: 0 }))
  );
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback(
    async (accepted: File[]) => {
      if (!accepted.length) return;
      setUploading(true);

      for (const file of accepted) {
        try {
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(new Error("Could not read file"));
            reader.readAsDataURL(file);
          });

          const response = await fetch("/api/groups/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              groupId,
              fileName: file.name,
              fileType: file.type,
              data: base64,
            }),
          });

          const result = await response.json();
          if (!response.ok) {
            throw new Error(result.error ?? "Upload failed");
          }

          setFiles((prev) => [
            ...prev,
            { url: result.url, fileName: result.fileName, fileSize: result.fileSize },
          ]);
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Upload failed");
        }
      }

      setUploading(false);
    },
    [groupId]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    disabled: readOnly,
    maxSize: 10 * 1024 * 1024,
  });

  function submit(shouldSubmit: boolean) {
    startTransition(async () => {
      try {
        await saveSubmission(assignmentId, {
          textAnswer: text,
          submit: shouldSubmit,
          fileUrls: files.map((f) => f.url),
        });
        router.refresh();
        toast.success(shouldSubmit ? "Work submitted" : "Draft saved");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not save submission");
      }
    });
  }

  if (readOnly) {
    return (
      <div className="clay-card p-5" data-testid="submission-readonly">
        <h3 className="font-display font-extrabold mb-2">Your submission</h3>
        {initialText ? (
          <p className="text-sm whitespace-pre-wrap bg-background/60 rounded-2xl p-4">{initialText}</p>
        ) : (
          <p className="text-sm text-on-surface/60">No written answer.</p>
        )}
        {files.length > 0 && (
          <ul className="mt-3 flex flex-col gap-1">
            {files.map((f) => (
              <li key={f.url}>
                <a
                  href={f.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-bold text-primary underline"
                >
                  {f.fileName}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div className="clay-card p-5" data-testid="submission-form">
      <h3 className="font-display font-extrabold mb-3">Your work</h3>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type your answer here"
        aria-label="Submission text"
        rows={6}
        className="w-full rounded-2xl border-2 border-black/5 bg-white px-4 py-3 focus:outline-none focus:border-primary/40"
        data-testid="submission-text-input"
      />

      <div
        {...getRootProps()}
        className={`mt-4 rounded-2xl border-2 border-dashed p-6 text-center text-sm font-semibold transition ${
          isDragActive ? "border-primary bg-primary/5" : "border-black/10 bg-background/50"
        } ${readOnly ? "opacity-50" : "cursor-pointer"}`}
        data-testid="submission-dropzone"
      >
        <input {...getInputProps()} data-testid="submission-file-input" />
        {uploading
          ? "Uploading..."
          : isDragActive
            ? "Drop files here"
            : "Drag files here, or click to choose"}
      </div>

      {files.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1" data-testid="submission-file-list">
          {files.map((f) => (
            <li key={f.url} className="flex items-center justify-between gap-3 text-sm">
              <a href={f.url} target="_blank" rel="noreferrer" className="font-bold text-primary underline truncate">
                {f.fileName}
              </a>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => setFiles((prev) => prev.filter((x) => x.url !== f.url))}
                  className="text-xs font-bold text-error shrink-0"
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={isPending || uploading}
          onClick={() => submit(false)}
          className="clay-btn bg-white text-on-surface px-5 py-2.5 disabled:opacity-60"
          data-testid="save-draft"
        >
          Save draft
        </button>
        <button
          type="button"
          disabled={isPending || uploading}
          onClick={() => submit(true)}
          className="clay-btn bg-primary text-white px-5 py-2.5 disabled:opacity-60"
          data-testid="submit-work"
        >
          Submit work
        </button>
      </div>

      {initialStatus !== "draft" && (
        <p className="mt-3 text-xs font-semibold text-on-surface/50">
          Current status: {initialStatus}
        </p>
      )}
    </div>
  );
}