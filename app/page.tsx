import Image from "next/image";

const recentAssets = [
  {
    title: "Chrome speaker study",
    type: "Image",
    size: "4:5",
    accent: "from-sky-100 via-zinc-100 to-emerald-100",
  },
  {
    title: "Studio motion pass",
    type: "Video",
    size: "16:9",
    accent: "from-slate-200 via-blue-100 to-cyan-100",
  },
  {
    title: "Campaign color boards",
    type: "Image",
    size: "1:1",
    accent: "from-amber-100 via-rose-100 to-stone-100",
  },
];

export default function Home() {
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
                    className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-blue-700"
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

                <form className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs">
                  <label className="sr-only" htmlFor="prompt">
                    Prompt
                  </label>
                  <textarea
                    className="min-h-12 w-full resize-none bg-transparent text-base leading-6 text-zinc-900 outline-none placeholder:text-zinc-400"
                    id="prompt"
                    placeholder="Describe an image or video to create"
                  />

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <button
                      className="grid size-8 place-items-center rounded-full text-xl leading-none text-zinc-500 transition hover:bg-zinc-100"
                      type="button"
                      aria-label="Add attachment"
                      title="Add attachment"
                    >
                      +
                    </button>

                    <button
                      className="grid size-9 place-items-center rounded-full bg-zinc-900 text-lg leading-none text-white transition hover:bg-zinc-700"
                      type="submit"
                      aria-label="Generate"
                      title="Generate"
                    >
                      →
                    </button>
                  </div>
                </form>
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

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {recentAssets.map((asset) => (
                <article
                  className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-xs"
                  key={asset.title}
                >
                  <div
                    className={`aspect-[16/10] bg-gradient-to-br ${asset.accent}`}
                  >
                    <div className="flex h-full items-end p-3">
                      <span className="rounded-md bg-white/85 px-2 py-1 text-xs font-medium text-zinc-700 shadow-xs backdrop-blur">
                        {asset.type}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1 p-3">
                    <h3 className="truncate text-sm font-medium text-zinc-900">
                      {asset.title}
                    </h3>
                    <p className="text-xs text-zinc-500">{asset.size}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
