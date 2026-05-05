const navItems = ["New", "Library", "Projects", "Models", "History"];

const quickActions = ["Image prompt", "Video concept", "Product shot"];

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
      <div className="grid min-h-screen grid-cols-1 md:grid-cols-[220px_1fr]">
        <aside className="hidden border-r border-zinc-200 bg-zinc-50/80 md:flex md:flex-col">
          <div className="flex h-16 items-center justify-between px-5">
            <div className="text-sm font-semibold">Studiobase</div>
            <button
              className="grid size-8 place-items-center rounded-md border border-zinc-200 bg-white text-zinc-500"
              type="button"
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
            >
              ◱
            </button>
          </div>

          <nav className="space-y-1 px-3 py-4 text-sm">
            {navItems.map((item, index) => (
              <a
                className={`flex items-center gap-3 rounded-md px-3 py-2 transition hover:bg-zinc-100 ${
                  index === 0
                    ? "font-medium text-zinc-950"
                    : "text-zinc-500"
                }`}
                href="#"
                key={item}
              >
                <span className="grid size-6 place-items-center rounded-full border border-zinc-200 bg-white text-xs">
                  {index === 0 ? "+" : "·"}
                </span>
                {item}
              </a>
            ))}
          </nav>

          <div className="mt-auto border-t border-zinc-200 p-4">
            <button
              className="flex w-full items-center justify-between rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700"
              type="button"
            >
              Sign in
              <span aria-hidden="true">›</span>
            </button>
          </div>
        </aside>

        <section className="px-4 py-10 sm:px-6 md:px-10">
          <div className="mx-auto flex w-full max-w-4xl flex-col">
            <div className="flex justify-center pt-16 md:pt-24">
              <div className="w-full max-w-3xl">
                <h1 className="text-center text-4xl font-light tracking-normal text-zinc-900 sm:text-5xl">
                  studiobase
                </h1>

                <form className="mt-12 rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs">
                  <label className="sr-only" htmlFor="prompt">
                    Prompt
                  </label>
                  <textarea
                    className="min-h-12 w-full resize-none bg-transparent text-base leading-6 text-zinc-900 outline-none placeholder:text-zinc-400"
                    id="prompt"
                    placeholder="Describe an image or video to create"
                  />

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <button
                        className="grid size-8 place-items-center rounded-full text-xl leading-none text-zinc-500 transition hover:bg-zinc-100"
                        type="button"
                        aria-label="Add attachment"
                        title="Add attachment"
                      >
                        +
                      </button>
                      <button
                        className="rounded-full bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-200"
                        type="button"
                      >
                        Image
                      </button>
                      <button
                        className="rounded-full px-3 py-1.5 text-sm font-medium text-zinc-500 transition hover:bg-zinc-100"
                        type="button"
                      >
                        Video
                      </button>
                    </div>

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

                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  {quickActions.map((action) => (
                    <button
                      className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
                      type="button"
                      key={action}
                    >
                      {action}
                    </button>
                  ))}
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
      </div>
    </main>
  );
}
