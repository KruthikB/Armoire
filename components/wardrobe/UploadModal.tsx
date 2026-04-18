"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { X, Upload, Loader2, CheckCircle, Plus } from "lucide-react";
import { useWardrobeStore } from "@/store/useWardrobeStore";
import { compressImage, validateImageFile } from "@/lib/utils";
import { ClothingItemDTO } from "@/types";
import toast from "react-hot-toast";

interface UploadModalProps {
  onClose: () => void;
}

type UploadStep = "idle" | "uploading" | "analysing" | "done" | "error";

const MAX_FILES = 4;

export default function UploadModal({ onClose }: UploadModalProps) {
  const { addItem } = useWardrobeStore();

  const [files,    setFiles]    = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [step,     setStep]     = useState<UploadStep>("idle");
  const [results,  setResults]  = useState<ClothingItemDTO[]>([]);

  const onDrop = useCallback((accepted: File[]) => {
    setFiles((prev) => {
      const remaining = MAX_FILES - prev.length;
      const toAdd     = accepted.slice(0, remaining).filter((f) => {
        const err = validateImageFile(f);
        if (err) { toast.error(err); return false; }
        return true;
      });
      setPreviews((p) => [...p, ...toAdd.map((f) => URL.createObjectURL(f))]);
      return [...prev, ...toAdd];
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept:   { "image/*": [".jpg", ".jpeg", ".png", ".webp"] },
    maxFiles: MAX_FILES,
    multiple: true,
    disabled: step !== "idle",
  });

  function removeFile(index: number) {
    URL.revokeObjectURL(previews[index]);
    setFiles((prev)    => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleUpload() {
    if (!files.length) return;

    setStep("uploading");
    try {
      const images = await Promise.all(
        files.map(async (f) => ({ imageData: await compressImage(f) }))
      );

      setStep("analysing");
      const res = await fetch("/api/wardrobe", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ images }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "Upload failed");
      }

      const { data } = await res.json();
      (data as ClothingItemDTO[]).forEach((item) => addItem(item));
      setResults(data);
      setStep("done");
      toast.success(`${data.length} item${data.length > 1 ? "s" : ""} added to your wardrobe!`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed.");
      setStep("error");
    }
  }

  function handleReset() {
    previews.forEach((p) => URL.revokeObjectURL(p));
    setFiles([]);
    setPreviews([]);
    setResults([]);
    setStep("idle");
  }

  const busy = step === "uploading" || step === "analysing";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-ink/40 backdrop-blur-sm animate-fade-in">
      <div className="w-full sm:max-w-lg glass sm:rounded-2xl rounded-t-2xl overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink/[0.07] flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-ink">Add clothing items</h2>
            <p className="text-xs text-ink/40 mt-0.5">Up to {MAX_FILES} items — analysed in one AI call</p>
          </div>
          <button
            onClick={onClose}
            className="text-ink/40 hover:text-ink transition-colors p-1 rounded-lg hover:bg-surface-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Done state */}
          {step === "done" ? (
            <div className="space-y-3 animate-fade-in">
              {results.map((item) => (
                <div key={item.id} className="flex items-start gap-3 p-3 bg-brand-500/8 rounded-xl border border-brand-500/20">
                  <CheckCircle className="w-4 h-4 text-brand-600 flex-shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink truncate">{item.name}</p>
                    <p className="text-xs text-ink/50">
                      {item.category} · {item.style} · {item.colors.join(", ")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* File preview grid */}
              {previews.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {previews.map((src, i) => (
                    <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-surface-2 group">
                      <img src={src} alt="" className="w-full h-full object-cover" />

                      {/* Analysing overlay */}
                      {busy && (
                        <div className="absolute inset-0 bg-ink/50 flex flex-col items-center justify-center gap-2">
                          <Loader2 className="w-6 h-6 text-white animate-spin" />
                          <p className="text-white text-xs">
                            {step === "uploading" ? "Uploading…" : "Analysing…"}
                          </p>
                        </div>
                      )}

                      {/* Remove button */}
                      {step === "idle" && (
                        <button
                          onClick={() => removeFile(i)}
                          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-ink/60 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-ink/80"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Index badge */}
                      <span className="absolute bottom-1.5 left-1.5 text-[10px] text-white/70 bg-ink/40 rounded px-1">
                        {i + 1}
                      </span>
                    </div>
                  ))}

                  {/* Add more tile */}
                  {step === "idle" && previews.length < MAX_FILES && (
                    <div
                      {...getRootProps()}
                      className="aspect-square rounded-xl border-2 border-dashed border-ink/[0.12] hover:border-brand-500/40 flex flex-col items-center justify-center cursor-pointer transition-colors hover:bg-surface-2"
                    >
                      <input {...getInputProps()} />
                      <Plus className="w-6 h-6 text-ink/25" />
                      <span className="text-[10px] text-ink/35 mt-1">
                        Add more ({MAX_FILES - previews.length} left)
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Drop zone (empty) */}
              {previews.length === 0 && (
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
                    isDragActive
                      ? "border-brand-500 bg-brand-500/5"
                      : "border-ink/[0.12] hover:border-brand-500/40 hover:bg-surface-2"
                  }`}
                >
                  <input {...getInputProps()} />
                  <Upload className="w-10 h-10 text-ink/20 mx-auto mb-3" />
                  <p className="text-ink/55 text-sm">
                    {isDragActive ? "Drop here" : "Drag & drop or click to choose"}
                  </p>
                  <p className="text-ink/30 text-xs mt-1">Up to {MAX_FILES} images · JPEG, PNG, WebP</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-6 py-4 border-t border-ink/[0.07] flex-shrink-0">
          {step === "done" ? (
            <>
              <button
                onClick={handleReset}
                className="flex-1 py-2.5 bg-surface-2 hover:bg-surface-3 text-ink/70 rounded-xl text-sm font-medium transition-colors"
              >
                Add more
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-medium transition-colors"
              >
                Done
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onClose}
                className="flex-1 py-2.5 bg-surface-2 hover:bg-surface-3 text-ink/60 rounded-xl text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={!files.length || busy}
                className="flex-1 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                {busy
                  ? step === "uploading" ? "Uploading…" : `Analysing ${files.length} item${files.length > 1 ? "s" : ""}…`
                  : files.length > 0
                    ? `Analyse ${files.length} item${files.length > 1 ? "s" : ""}`
                    : "Select images first"
                }
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
