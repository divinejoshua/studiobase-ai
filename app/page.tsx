"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  SignInButton,
  UserButton,
  useClerk,
  useUser,
} from "@clerk/nextjs";
import {
  ALLOWED_REFERENCE_MIME_TYPES,
  MAX_REFERENCE_IMAGES,
} from "@/lib/constants";

type AspectRatio = "1:1" | "16:9" | "9:16";
type ImageSize = "1K" | "2K" | "4K";

type Reference = {
  id: string;
  fileName: string;
  localUrl: string;
  status: "uploading" | "ready" | "error";
  viewUrl?: string;
  error?: string;
};

type Generation = {
  id: string;
  prompt: string;
  aspectRatio: AspectRatio;
  imageSize?: ImageSize;
  imageUrl: string;
};

const ASPECT_RATIOS: AspectRatio[] = ["1:1", "16:9", "9:16"];
const IMAGE_SIZES: ImageSize[] = ["1K", "2K", "4K"];

const aspectIconBox: Record<AspectRatio, { w: number; h: number }> = {
  "1:1": { w: 10, h: 10 },
  "16:9": { w: 12, h: 7 },
  "9:16": { w: 7, h: 12 },
};

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("1:1");
  const [imageSize, setImageSize] = useState<ImageSize>("1K");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [references, setReferences] = useState<Reference[]>([]);
  const [zoomed, setZoomed] = useState<Generation | null>(null);
  const [pendingSubmit, setPendingSubmit] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isSignedIn, isLoaded: userLoaded } = useUser();
  const { openSignIn } = useClerk();

  useEffect(() => {
    if (!zoomed) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setZoomed(null);
    }
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [zoomed]);

  useEffect(() => {
    return () => {
      references.forEach((ref) => URL.revokeObjectURL(ref.localUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [draftRestored, setDraftRestored] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("studiobase-draft");
      if (raw) {
        const draft = JSON.parse(raw);
        if (typeof draft.prompt === "string") setPrompt(draft.prompt);
        if (
          draft.aspectRatio &&
          ASPECT_RATIOS.includes(draft.aspectRatio as AspectRatio)
        ) {
          setAspectRatio(draft.aspectRatio as AspectRatio);
        }
        if (
          draft.imageSize &&
          IMAGE_SIZES.includes(draft.imageSize as ImageSize)
        ) {
          setImageSize(draft.imageSize as ImageSize);
        }
        if (Array.isArray(draft.references)) {
          setReferences(
            draft.references
              .filter(
                (r: { viewUrl?: string }) =>
                  typeof r.viewUrl === "string" && r.viewUrl.length > 0,
              )
              .map((r: { id: string; fileName: string; viewUrl: string }) => ({
                id: r.id,
                fileName: r.fileName,
                localUrl: r.viewUrl,
                status: "ready" as const,
                viewUrl: r.viewUrl,
              })),
          );
        }
      }
    } catch {
      // ignore corrupt draft
    }
    setDraftRestored(true);
  }, []);

  useEffect(() => {
    if (!draftRestored) return;
    const draft = {
      prompt,
      aspectRatio,
      imageSize,
      references: references
        .filter((r) => r.status === "ready" && r.viewUrl)
        .map((r) => ({
          id: r.id,
          fileName: r.fileName,
          viewUrl: r.viewUrl,
        })),
    };
    try {
      localStorage.setItem("studiobase-draft", JSON.stringify(draft));
    } catch {
      // ignore quota errors
    }
  }, [prompt, aspectRatio, imageSize, references, draftRestored]);

  async function uploadReference(file: File): Promise<void> {
    const id = crypto.randomUUID();
    const localUrl = URL.createObjectURL(file);

    setReferences((prev) => [
      ...prev,
      { id, fileName: file.name, localUrl, status: "uploading" },
    ]);

    try {
      const presignRes = await fetch("/api/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType: file.type }),
      });
      const presign = await presignRes.json();
      if (!presignRes.ok) {
        throw new Error(presign?.error ?? "Failed to get upload URL");
      }

      const putRes = await fetch(presign.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!putRes.ok) {
        throw new Error(`Upload failed (${putRes.status})`);
      }

      setReferences((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, status: "ready", viewUrl: presign.viewUrl } : r,
        ),
      );
    } catch (err) {
      setReferences((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
              ...r,
              status: "error",
              error: err instanceof Error ? err.message : "Upload failed",
            }
            : r,
        ),
      );
    }
  }

  function handleFilesSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files) return;
    const eligible = Array.from(files).filter((file) =>
      ALLOWED_REFERENCE_MIME_TYPES.includes(file.type),
    );
    const remaining = MAX_REFERENCE_IMAGES - references.length;
    eligible
      .slice(0, Math.max(remaining, 0))
      .forEach((file) => void uploadReference(file));
    if (eligible.length > remaining) {
      setError(`You can attach up to ${MAX_REFERENCE_IMAGES} reference images.`);
    }
    event.target.value = "";
  }

  function removeReference(id: string) {
    setReferences((prev) => {
      const target = prev.find((r) => r.id === id);
      if (target) URL.revokeObjectURL(target.localUrl);
      return prev.filter((r) => r.id !== id);
    });
  }

  async function runGenerate() {
    const trimmed = prompt.trim();
    if (!trimmed || isGenerating) return;
    if (references.some((r) => r.status === "uploading")) return;

    setIsGenerating(true);
    setError(null);

    try {
      const referenceUrls = references
        .filter((r) => r.status === "ready" && r.viewUrl)
        .map((r) => r.viewUrl as string);

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: trimmed,
          aspectRatio,
          imageSize,
          referenceUrls,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error ?? "Failed to generate image");
      }

      setGenerations((prev) => [
        {
          id: crypto.randomUUID(),
          prompt: trimmed,
          aspectRatio,
          imageSize,
          imageUrl: data.imageUrl,
        },
        ...prev,
      ]);
      setPrompt("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsGenerating(false);
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userLoaded) return;
    if (!isSignedIn) {
      setPendingSubmit(true);
      openSignIn();
      return;
    }
    void runGenerate();
  }

  useEffect(() => {
    if (isSignedIn && pendingSubmit) {
      setPendingSubmit(false);
      void runGenerate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn, pendingSubmit]);

  function handleDownload(gen: Generation) {
    const link = document.createElement("a");
    link.href = gen.imageUrl;
    link.download = `studiobase-${gen.id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async function handleEdit(gen: Generation) {
    if (references.length >= MAX_REFERENCE_IMAGES) {
      setError(`You can attach up to ${MAX_REFERENCE_IMAGES} reference images.`);
      return;
    }
    setAspectRatio(gen.aspectRatio);
    if (gen.imageSize) setImageSize(gen.imageSize);
    document.getElementById("prompt")?.focus();

    try {
      const res = await fetch(gen.imageUrl);
      const blob = await res.blob();
      const file = new File([blob], `studiobase-${gen.id}.png`, {
        type: blob.type || "image/png",
      });
      await uploadReference(file);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load image to edit",
      );
    }
  }

  return (
    <main className="min-h-screen bg-white text-zinc-950">
      <header className="fixed left-0 top-0 z-10 flex h-16 w-full items-center justify-between border-b border-zinc-200 bg-white/80 px-4 backdrop-blur sm:px-6 md:px-10">
        <a
          className="flex items-center gap-2 font-semibold tracking-normal text-zinc-950"
          href="#"
        >
          <Image
            src="/logo.png"
            alt=""
            width={24}
            height={24}
            className="size-6 rounded-md"
            priority
          />
          Studiobase
        </a>
        <div className="flex items-center gap-2">
          {userLoaded && !isSignedIn && (
            <SignInButton mode="modal">
              <button className="rounded-full bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-zinc-700">
                Sign in
              </button>
            </SignInButton>
          )}
          {userLoaded && isSignedIn && <UserButton />}
        </div>
      </header>

      <section className="px-4 py-10 sm:px-6 md:px-10">
        <div className="mx-auto flex w-full max-w-4xl flex-col">
          <div className="flex justify-center pt-16 md:pt-24">
            <div className="w-full max-w-3xl">
              <h1 className="text-center text-4xl font-semibold tracking-normal text-zinc-950 sm:text-4xl">
                Generate Quality Product Ads in Seconds
              </h1>
              <p className="mx-auto mt-4 max-w-2xl text-center text-base leading-7 text-zinc-500">
                Generate images and videos for products, campaigns, and social
                stories.
              </p>

              <div className="mt-10">
                <div className="mb-2 flex items-center gap-2 pl-2">
                  <button
                    className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-200"
                    type="button"
                  >
                    <svg
                      className="size-3.5"
                      viewBox="0 0 20 20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <polyline points="4 10 8 14 16 6" />
                    </svg>
                    Image
                  </button>
                  <button
                    className="rounded-full px-3 py-1.5 text-sm font-medium text-zinc-500 transition hover:bg-zinc-100"
                    type="button"
                  >
                    Video
                  </button>
                </div>

                <form
                  className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs"
                  onSubmit={handleSubmit}
                >
                  <label className="sr-only" htmlFor="prompt">
                    Prompt
                  </label>
                  <textarea
                    className="min-h-12 w-full resize-none bg-transparent text-base leading-6 text-zinc-900 outline-none placeholder:text-zinc-400"
                    id="prompt"
                    placeholder="Describe an image to create"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    disabled={isGenerating}
                  />

                  {references.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {references.map((ref) => (
                        <div
                          key={ref.id}
                          className="group relative size-16 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={ref.localUrl}
                            alt={ref.fileName}
                            className="h-full w-full object-cover"
                          />
                          {ref.status === "uploading" && (
                            <div className="absolute inset-0 grid place-items-center bg-white/60">
                              <svg
                                className="size-5 animate-spin text-zinc-700"
                                viewBox="0 0 20 20"
                                fill="none"
                                aria-hidden="true"
                              >
                                <circle
                                  cx="10"
                                  cy="10"
                                  r="7"
                                  stroke="currentColor"
                                  strokeOpacity="0.25"
                                  strokeWidth="2.5"
                                />
                                <path
                                  d="M10 3a7 7 0 0 1 7 7"
                                  stroke="currentColor"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                />
                              </svg>
                            </div>
                          )}
                          {ref.status === "error" && (
                            <div
                              className="absolute inset-0 grid place-items-center bg-red-500/70 text-[10px] font-medium text-white"
                              title={ref.error}
                            >
                              Failed
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => removeReference(ref.id)}
                            className="absolute right-1 top-1 grid size-5 place-items-center rounded-full bg-zinc-900/70 text-white opacity-0 transition group-hover:opacity-100"
                            aria-label={`Remove ${ref.fileName}`}
                          >
                            <svg
                              className="size-3"
                              viewBox="0 0 20 20"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              aria-hidden="true"
                            >
                              <line x1="5" y1="5" x2="15" y2="15" />
                              <line x1="15" y1="5" x2="5" y2="15" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ALLOWED_REFERENCE_MIME_TYPES.join(",")}
                    multiple
                    className="hidden"
                    onChange={handleFilesSelected}
                  />

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        className="grid size-8 place-items-center rounded-full text-xl leading-none text-zinc-500 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
                        type="button"
                        aria-label="Add reference image"
                        title={
                          references.length >= MAX_REFERENCE_IMAGES
                            ? `Limit of ${MAX_REFERENCE_IMAGES} reference images reached`
                            : "Add reference image"
                        }
                        onClick={() => fileInputRef.current?.click()}
                        disabled={references.length >= MAX_REFERENCE_IMAGES}
                      >
                        +
                      </button>

                      <div
                        className="flex items-center rounded-full bg-zinc-100 p-0.5"
                        role="group"
                        aria-label="Aspect ratio"
                      >
                        {ASPECT_RATIOS.map((ratio) => {
                          const box = aspectIconBox[ratio];
                          return (
                            <button
                              key={ratio}
                              type="button"
                              onClick={() => setAspectRatio(ratio)}
                              aria-pressed={aspectRatio === ratio}
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition ${aspectRatio === ratio
                                ? "bg-white text-zinc-900 shadow-xs"
                                : "text-zinc-500 hover:text-zinc-800"
                                }`}
                            >
                              <svg
                                className="size-3.5 shrink-0"
                                viewBox="0 0 16 16"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                aria-hidden="true"
                              >
                                <rect
                                  x={(16 - box.w) / 2}
                                  y={(16 - box.h) / 2}
                                  width={box.w}
                                  height={box.h}
                                  rx="1.5"
                                />
                              </svg>
                              {ratio}
                            </button>
                          );
                        })}
                      </div>

                      <div className="relative">
                        <select
                          className="appearance-none rounded-full bg-zinc-100 py-1.5 pl-3 pr-7 text-xs font-medium text-zinc-700 transition hover:bg-zinc-200 focus:outline-none"
                          aria-label="Resolution"
                          value={imageSize}
                          onChange={(e) =>
                            setImageSize(e.target.value as ImageSize)
                          }
                        >
                          {IMAGE_SIZES.map((size) => (
                            <option key={size} value={size}>
                              {size}
                            </option>
                          ))}
                        </select>
                        <svg
                          className="pointer-events-none absolute right-2 top-1/2 size-3 -translate-y-1/2 text-zinc-500"
                          viewBox="0 0 20 20"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <polyline points="5 8 10 13 15 8" />
                        </svg>
                      </div>
                    </div>

                    <button
                      className="grid size-9 place-items-center rounded-full bg-zinc-900 text-lg leading-none text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
                      type="submit"
                      aria-label="Generate"
                      title="Generate"
                      disabled={
                        isGenerating ||
                        prompt.trim().length === 0 ||
                        references.some((r) => r.status === "uploading")
                      }
                    >
                      {isGenerating ? (
                        <svg
                          className="size-4 animate-spin"
                          viewBox="0 0 20 20"
                          fill="none"
                          aria-hidden="true"
                        >
                          <circle
                            cx="10"
                            cy="10"
                            r="7"
                            stroke="currentColor"
                            strokeOpacity="0.25"
                            strokeWidth="2.5"
                          />
                          <path
                            d="M10 3a7 7 0 0 1 7 7"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                          />
                        </svg>
                      ) : (
                        "→"
                      )}
                    </button>
                  </div>
                </form>

                {error && (
                  <p className="mt-3 text-center text-sm text-red-600">
                    {error}
                  </p>
                )}
              </div>
            </div>
          </div>

          <section className="mt-14">
            <div className="mb-5 flex items-center justify-between gap-4">
              <h2 className="text-base font-semibold tracking-normal text-zinc-800">
                Recent generations
              </h2>
              <a className="text-sm font-medium text-zinc-500" href="#">
                View all
              </a>
            </div>

            {generations.length === 0 && !isGenerating ? (
              <div className="rounded-lg border border-dashed border-zinc-200 px-4 py-12 text-center text-sm text-zinc-500">
                Your generated images will appear here.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {isGenerating && (
                  <article
                    className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-xs"
                    aria-busy="true"
                    aria-live="polite"
                  >
                    <div className="relative aspect-square w-full overflow-hidden bg-zinc-100">
                      <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-zinc-100 via-zinc-200 to-zinc-100" />
                      <span className="sr-only">Generating image…</span>
                    </div>
                    <div className="flex items-start justify-between gap-2 p-3">
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="h-3.5 w-3/4 animate-pulse rounded bg-zinc-200" />
                        <div className="h-3 w-1/3 animate-pulse rounded bg-zinc-200" />
                      </div>
                    </div>
                  </article>
                )}
                {generations.map((gen) => (
                  <article
                    className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-xs"
                    key={gen.id}
                  >
                    <button
                      type="button"
                      onClick={() => setZoomed(gen)}
                      className="group relative block aspect-square w-full overflow-hidden bg-zinc-100"
                      aria-label="Zoom image"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={gen.imageUrl}
                        alt={gen.prompt}
                        className="absolute inset-0 h-full w-full object-contain"
                      />
                      <span className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-zinc-900/70 text-white opacity-0 transition group-hover:opacity-100">
                        <svg
                          className="size-4"
                          viewBox="0 0 20 20"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.75"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <circle cx="9" cy="9" r="5.5" />
                          <line x1="9" y1="6.5" x2="9" y2="11.5" />
                          <line x1="6.5" y1="9" x2="11.5" y2="9" />
                          <line x1="13" y1="13" x2="16.5" y2="16.5" />
                        </svg>
                      </span>
                    </button>
                    <div className="flex items-start justify-between gap-2 p-3">
                      <div className="min-w-0 flex-1 space-y-1">
                        <h3 className="truncate text-sm font-medium text-zinc-900">
                          {gen.prompt}
                        </h3>
                        <p className="text-xs text-zinc-500">
                          {[gen.aspectRatio, gen.imageSize]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleEdit(gen)}
                          className="grid size-8 place-items-center rounded-full text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
                          aria-label="Edit image"
                          title="Edit image"
                        >
                          <svg
                            className="size-4"
                            viewBox="0 0 20 20"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.75"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <path d="M14 3.5a1.77 1.77 0 0 1 2.5 2.5L7 15.5 3.5 16.5l1-3.5Z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownload(gen)}
                          className="grid size-8 place-items-center rounded-full text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
                          aria-label="Download image"
                          title="Download image"
                        >
                          <svg
                            className="size-4"
                            viewBox="0 0 20 20"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.75"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <path d="M10 3v10" />
                            <polyline points="6 9 10 13 14 9" />
                            <path d="M4 16h12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </section>

      {zoomed && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/80"
          onClick={() => setZoomed(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Zoomed image"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={zoomed.imageUrl}
            alt={zoomed.prompt}
            className="h-dvh max-w-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={() => setZoomed(null)}
            className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-white/15 text-white backdrop-blur transition hover:bg-white/25"
            aria-label="Close"
          >
            <svg
              className="size-5"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <line x1="5" y1="5" x2="15" y2="15" />
              <line x1="15" y1="5" x2="5" y2="15" />
            </svg>
          </button>
        </div>
      )}
    </main>
  );
}
