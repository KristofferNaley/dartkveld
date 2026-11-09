import { PageTitle } from "@/components/ui";
import { usageOverview } from "@/lib/admin";

export const metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

const weekLabel = new Intl.DateTimeFormat("nb-NO", { day: "numeric", month: "short", timeZone: "UTC" });

function BarChart({ title, data }: { title: string; data: { week: string; n: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.n));
  const total = data.reduce((a, d) => a + d.n, 0);
  return (
    <section className="rounded-2xl border border-line bg-panel p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="font-semibold">{title}</h2>
        <span className="text-xs text-muted">{total} siste {data.length} uker</span>
      </div>
      <div className="flex h-32 items-end gap-1" role="img" aria-label={title}>
        {data.map((d) => (
          <div key={d.week} className="group relative flex h-full flex-1 flex-col justify-end" title={`Uke fra ${weekLabel.format(new Date(d.week))}: ${d.n}`}>
            <span className="tabular mb-0.5 text-center text-[10px] text-muted">{d.n > 0 ? d.n : ""}</span>
            <div className="w-full rounded-t bg-accent" style={{ height: `${(d.n / max) * 100}%`, minHeight: d.n > 0 ? 3 : 1, opacity: d.n > 0 ? 1 : 0.25 }} />
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-muted">
        <span>{weekLabel.format(new Date(data[0].week))}</span>
        <span>{weekLabel.format(new Date(data.at(-1)!.week))}</span>
      </div>
    </section>
  );
}

export default async function AdminPage() {
  const o = await usageOverview();
  const tiles = [
    { label: "Brukere", value: o.users, hint: o.banned ? `${o.banned} sperret` : undefined },
    { label: "Aktive siste 30 dager", value: o.active30 },
    { label: "Grupper", value: o.groups },
    { label: "Kamper", value: o.matches },
    { label: "Pågående kamper", value: o.activeMatches },
    { label: "Kast totalt", value: o.throws },
  ];
  return (
    <div className="space-y-5">
      <PageTitle sub="Bruk av appen over tid">Admin</PageTitle>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-2xl border border-line bg-panel p-4">
            <div className="tabular text-3xl font-bold">{t.value}</div>
            <div className="text-sm text-muted">{t.label}</div>
            {t.hint && <div className="text-xs text-danger">{t.hint}</div>}
          </div>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {o.series.map((s) => (
          <BarChart key={s.key} title={s.title} data={s.data} />
        ))}
      </div>
    </div>
  );
}
