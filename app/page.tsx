"use client";

import Image from "next/image";
import { useState } from "react";

type AspectRatio = "1:1" | "16:9" | "9:16";
type ImageSize = "1K" | "2K" | "4K";

type Generation = {
  id: string;
  prompt: string;
  aspectRatio: AspectRatio;
  imageUrl: string;
};

const ASPECT_RATIOS: AspectRatio[] = ["1:1", "16:9", "9:16"];
const IMAGE_SIZES: ImageSize[] = ["1K", "2K", "4K"];

const aspectClass: Record<AspectRatio, string> = {
  "1:1": "aspect-square",
  "16:9": "aspect-[16/9]",
  "9:16": "aspect-[9/16]",
};

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("1:1");
  const [imageSize, setImageSize] = useState<ImageSize>("1K");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generations, setGenerations] = useState<Generation[]>([]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = prompt.trim();
    if (!trimmed || isGenerating) return;

    setIsGenerating(true);
    setError(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: trimmed,
          aspectRatio,
          imageSize,
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

  return (
    <main className="min-h-screen bg-white text-zinc-950">
      <header className="fixed left-0 top-0 z-10 flex h-16 w-full items-center border-b border-zinc-200 bg-white/80 px-4 backdrop-blur sm:px-6 md:px-10">
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
      </header>

      <section className="px-4 py-10 sm:px-6 md:px-10">
        <div className="mx-auto flex w-full max-w-4xl flex-col">
          <div className="flex justify-center pt-16 md:pt-24">
            <div className="w-full max-w-3xl">
              <h1 className="text-center text-4xl font-semibold tracking-normal text-zinc-950 sm:text-4xl">
                Create studio-quality visuals
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
                    placeholder="Describe an image or video to create"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    disabled={isGenerating}
                  />

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        className="grid size-8 place-items-center rounded-full text-xl leading-none text-zinc-500 transition hover:bg-zinc-100"
                        type="button"
                        aria-label="Add attachment"
                        title="Add attachment"
                      >
                        +
                      </button>

                      <div
                        className="flex items-center rounded-full bg-zinc-100 p-0.5"
                        role="group"
                        aria-label="Aspect ratio"
                      >
                        {ASPECT_RATIOS.map((ratio) => (
                          <button
                            key={ratio}
                            type="button"
                            onClick={() => setAspectRatio(ratio)}
                            aria-pressed={aspectRatio === ratio}
                            className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                              aspectRatio === ratio
                                ? "bg-white text-zinc-900 shadow-xs"
                                : "text-zinc-500 hover:text-zinc-800"
                            }`}
                          >
                            {ratio}
                          </button>
                        ))}
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
                      disabled={isGenerating || prompt.trim().length === 0}
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

            {generations.length === 0 ? (
              <div className="rounded-lg border border-dashed border-zinc-200 px-4 py-12 text-center text-sm text-zinc-500">
                Your generated images will appear here.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {generations.map((gen) => (
                  <article
                    className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-xs"
                    key={gen.id}
                  >
                    <div
                      className={`relative w-full overflow-hidden bg-zinc-100 ${aspectClass[gen.aspectRatio]}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={gen.imageUrl}
                        alt={gen.prompt}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="space-y-1 p-3">
                      <h3 className="truncate text-sm font-medium text-zinc-900">
                        {gen.prompt}
                      </h3>
                      <p className="text-xs text-zinc-500">
                        {gen.aspectRatio}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
