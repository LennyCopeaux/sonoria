export default function HomePage() {
  return (
    <div className="p-6">
      <section className="mb-12">
        <h2 className="mb-4 text-2xl font-bold text-white">En tendance</h2>
        <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-dashed border-zinc-700 bg-zinc-900/50 text-sm text-zinc-500">
          Contenu à venir
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-bold text-white">
          Playlists populaires
        </h2>
        <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-dashed border-zinc-700 bg-zinc-900/50 text-sm text-zinc-500">
          Contenu à venir
        </div>
      </section>
    </div>
  );
}
