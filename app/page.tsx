const recentAssets = [
  {
    title: "Product launch still",
    type: "Image",
    size: "4:5",
    style: "Editorial",
    accent: "from-sky-200 via-zinc-100 to-emerald-200",
  },
  {
    title: "Studio motion test",
    type: "Video",
    size: "16:9",
    style: "Cinematic",
    accent: "from-zinc-800 via-indigo-500 to-cyan-300",
  },
  {
    title: "Campaign texture pass",
    type: "Image",
    size: "1:1",
    style: "Analog",
    accent: "from-amber-200 via-rose-200 to-stone-200",
  },
];

const queue = [
  ["Storyboard animatic", "Rendering", "68%"],
  ["Package hero image", "Queued", "12%"],
  ["Social cutdown", "Draft", "0%"],
];

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[280px_1fr]">
        <aside className="border-b bg-sidebar text-sidebar-foreground lg:border-b-0 lg:border-r">
          <div className="flex h-full flex-col">
            <div className="flex h-16 items-center justify-between border-b px-5">
              <div>
                <p className="text-sm font-semibold tracking-normal">
                  Studiobase
                </p>
                <p className="text-xs text-muted-foreground">Creative engine</p>
              </div>
              <button
                className="grid size-9 place-items-center rounded-md border bg-background text-sm shadow-xs transition hover:bg-accent"
                type="button"
                aria-label="Open command menu"
                title="Open command menu"
              >
                /
              </button>
            </div>

            <nav className="flex gap-1 overflow-x-auto p-3 text-sm lg:flex-col">
              {["Create", "Library", "Projects", "Models", "Billing"].map(
                (item, index) => (
                  <a
                    className={`whitespace-nowrap rounded-md px-3 py-2 transition hover:bg-sidebar-accent ${
                      index === 0
                        ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                        : "text-muted-foreground"
                    }`}
                    href="#"
                    key={item}
                  >
                    {item}
                  </a>
                ),
              )}
            </nav>

            <div className="mt-auto hidden border-t p-4 lg:block">
              <div className="rounded-lg border bg-card p-4 text-card-foreground shadow-xs">
                <p className="text-sm font-medium">Credits</p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full w-2/3 rounded-full bg-primary" />
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>1,480 left</span>
                  <span>Pro plan</span>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <section className="flex min-w-0 flex-col">
          <header className="flex min-h-16 flex-col justify-center gap-3 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <h1 className="text-xl font-semibold tracking-normal">
                Create media
              </h1>
              <p className="text-sm text-muted-foreground">
                Generate images and videos from one production brief.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="rounded-md border bg-background px-3 py-2 text-sm font-medium shadow-xs transition hover:bg-accent"
                type="button"
              >
                Import
              </button>
              <button
                className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-xs transition hover:opacity-90"
                type="button"
              >
                New project
              </button>
            </div>
          </header>

          <div className="grid flex-1 grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="min-w-0 space-y-6 px-4 py-5 sm:px-6">
              <section className="rounded-lg border bg-card text-card-foreground shadow-sm">
                <div className="border-b p-4 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-base font-semibold tracking-normal">
                        Prompt
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        Describe the output, then tune format and motion.
                      </p>
                    </div>
                    <div className="grid grid-cols-2 rounded-md bg-muted p-1 text-sm">
                      <button
                        className="rounded-sm bg-background px-3 py-1.5 font-medium shadow-xs"
                        type="button"
                      >
                        Image
                      </button>
                      <button
                        className="rounded-sm px-3 py-1.5 text-muted-foreground"
                        type="button"
                      >
                        Video
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 p-4 sm:p-5">
                  <textarea
                    className="min-h-40 w-full resize-none rounded-lg border bg-background p-4 text-sm leading-6 shadow-xs outline-none transition placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/30"
                    defaultValue="A precise studio campaign shot of a brushed aluminum speaker on a concrete plinth, soft daylight, subtle reflections, premium tech editorial styling."
                  />

                  <div className="grid gap-3 md:grid-cols-4">
                    {[
                      ["Aspect", "4:5"],
                      ["Style", "Editorial"],
                      ["Quality", "High"],
                      ["Outputs", "4"],
                    ].map(([label, value]) => (
                      <label className="grid gap-1.5" key={label}>
                        <span className="text-xs font-medium text-muted-foreground">
                          {label}
                        </span>
                        <select
                          className="h-10 rounded-md border bg-background px-3 text-sm shadow-xs outline-none focus:ring-2 focus:ring-ring/30"
                          defaultValue={value}
                        >
                          <option>{value}</option>
                          <option>16:9</option>
                          <option>1:1</option>
                          <option>Fast</option>
                        </select>
                      </label>
                    ))}
                  </div>

                  <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <label className="flex items-center gap-2 text-sm text-muted-foreground">
                      <input
                        className="size-4 rounded border-input"
                        defaultChecked
                        type="checkbox"
                      />
                      Use brand references
                    </label>
                    <button
                      className="rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90"
                      type="button"
                    >
                      Generate
                    </button>
                  </div>
                </div>
              </section>

              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-base font-semibold tracking-normal">
                    Recent generations
                  </h2>
                  <a className="text-sm font-medium text-muted-foreground" href="#">
                    View all
                  </a>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  {recentAssets.map((asset) => (
                    <article
                      className="overflow-hidden rounded-lg border bg-card shadow-xs"
                      key={asset.title}
                    >
                      <div
                        className={`aspect-[4/3] bg-gradient-to-br ${asset.accent}`}
                      >
                        <div className="flex h-full items-end p-3">
                          <span className="rounded-md bg-background/85 px-2 py-1 text-xs font-medium text-foreground shadow-xs backdrop-blur">
                            {asset.type}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-2 p-3">
                        <h3 className="truncate text-sm font-medium">
                          {asset.title}
                        </h3>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{asset.size}</span>
                          <span>{asset.style}</span>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </div>

            <aside className="border-t bg-muted/35 p-4 sm:p-6 xl:border-l xl:border-t-0">
              <section className="rounded-lg border bg-card p-4 shadow-xs">
                <h2 className="text-base font-semibold tracking-normal">
                  Render queue
                </h2>
                <div className="mt-4 space-y-4">
                  {queue.map(([title, status, progress]) => (
                    <div className="space-y-2" key={title}>
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="min-w-0 truncate font-medium">
                          {title}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {status}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: progress }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="mt-4 rounded-lg border bg-card p-4 shadow-xs">
                <h2 className="text-base font-semibold tracking-normal">
                  Reference set
                </h2>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {["Brand", "Object", "Mood"].map((item) => (
                    <div
                      className="grid aspect-square place-items-center rounded-md border bg-muted text-xs font-medium text-muted-foreground"
                      key={item}
                    >
                      {item}
                    </div>
                  ))}
                </div>
                <button
                  className="mt-4 w-full rounded-md border bg-background px-3 py-2 text-sm font-medium shadow-xs transition hover:bg-accent"
                  type="button"
                >
                  Add references
                </button>
              </section>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}
