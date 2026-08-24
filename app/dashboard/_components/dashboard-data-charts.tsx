"use client";

import { Bar, BarChart, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";

import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

type DashboardDataChartsProps = {
  blocks: { active: number; stopped: number; notOperating: number };
  cash: { incoming: number; outgoing: number };
  dues: { received: number; outstanding: number };
  realizations: Record<string, number>;
};

const cashConfig = {
  incoming: { label: "Pemasukan", color: "#2563eb" },
  outgoing: { label: "Pengeluaran", color: "#ef4444" },
} satisfies ChartConfig;

const blockConfig = {
  total: { label: "Blok", color: "#2563eb" },
} satisfies ChartConfig;

const pieColors = ["#168144", "#ef8a13"];

export function DashboardDataCharts({ blocks, cash, dues, realizations }: DashboardDataChartsProps) {
  const collection = [
    { name: "Diterima", value: Math.max(0, dues.received) },
    { name: "Tunggakan", value: Math.max(0, dues.outstanding) },
  ];
  const blockRows = [
    { name: "Aktif", total: blocks.active },
    { name: "Berhenti", total: blocks.stopped },
    { name: "Belum operasi", total: blocks.notOperating },
  ];
  const cashRows = [{ name: "Bulan ini", incoming: Math.max(0, cash.incoming), outgoing: Math.max(0, cash.outgoing) }];
  const workflowRows = ["DRAFT", "SUBMITTED", "VERIFIED", "SAH", "REJECTED"].map((status) => ({ name: status, total: realizations[status] ?? 0 }));

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <section className="rounded-xl border border-[#dfe4ec] bg-white p-5 shadow-[0_2px_8px_rgba(20,45,88,0.05)]">
        <div className="flex items-end justify-between gap-4"><div><h2 className="text-sm font-extrabold uppercase tracking-[0.12em] text-[#142d60]">Pemasukan vs pengeluaran</h2><p className="mt-1 text-xs text-[#718096]">Transaksi kas sah pada periode berjalan.</p></div></div>
        <ChartContainer className="mt-5 h-56 w-full" config={cashConfig}>
          <BarChart accessibilityLayer data={cashRows} margin={{ left: 4, right: 4 }}>
            <XAxis axisLine={false} dataKey="name" tickLine={false} />
            <YAxis axisLine={false} tickFormatter={(value) => `${Math.round(Number(value) / 1_000_000)}jt`} tickLine={false} width={38} />
            <ChartTooltip content={<ChartTooltipContent />} cursor={false} formatter={(value) => `Rp ${Number(value).toLocaleString("id-ID")}`} />
            <Bar dataKey="incoming" fill="var(--color-incoming)" radius={[5, 5, 0, 0]} />
            <Bar dataKey="outgoing" fill="var(--color-outgoing)" radius={[5, 5, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </section>

      <section className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-xl border border-[#dfe4ec] bg-white p-5 shadow-[0_2px_8px_rgba(20,45,88,0.05)]"><h2 className="text-sm font-extrabold uppercase tracking-[0.12em] text-[#142d60]">Status blok</h2><ChartContainer className="mt-4 h-48 w-full" config={blockConfig}><BarChart accessibilityLayer data={blockRows} layout="vertical" margin={{ left: 10, right: 8 }}><XAxis axisLine={false} type="number" /><YAxis axisLine={false} dataKey="name" tickLine={false} type="category" width={76} /><ChartTooltip content={<ChartTooltipContent />} cursor={false} /><Bar dataKey="total" fill="var(--color-total)" radius={[0, 5, 5, 0]} /></BarChart></ChartContainer></div>
        <div className="rounded-xl border border-[#dfe4ec] bg-white p-5 shadow-[0_2px_8px_rgba(20,45,88,0.05)]"><h2 className="text-sm font-extrabold uppercase tracking-[0.12em] text-[#142d60]">Iuran bulan ini</h2><ChartContainer className="mt-4 h-36 w-full" config={{}}><PieChart accessibilityLayer><Pie cx="50%" cy="50%" data={collection} dataKey="value" innerRadius={42} outerRadius={62} paddingAngle={4}>{collection.map((entry, index) => <Cell fill={pieColors[index]} key={entry.name} />)}</Pie><ChartTooltip content={<ChartTooltipContent nameKey="name" formatter={(value) => `Rp ${Number(value).toLocaleString("id-ID")}`} />} /></PieChart></ChartContainer><div className="mt-2 space-y-1.5 text-xs text-[#718096]">{collection.map((entry, index) => <p className="flex justify-between" key={entry.name}><span><i className="mr-1.5 inline-block size-2 rounded-full" style={{ backgroundColor: pieColors[index] }} />{entry.name}</span><strong className="text-[#263959]">Rp {entry.value.toLocaleString("id-ID")}</strong></p>)}</div></div>
      </section>

      <section className="xl:col-span-2 rounded-xl border border-[#dfe4ec] bg-white p-5 shadow-[0_2px_8px_rgba(20,45,88,0.05)]"><h2 className="text-sm font-extrabold uppercase tracking-[0.12em] text-[#142d60]">Alur pengajuan realisasi</h2><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">{workflowRows.map((row) => <div className="rounded-lg bg-[#f7f9fc] p-3" key={row.name}><p className="text-[10px] font-bold text-[#718096]">{row.name}</p><p className="mt-2 text-xl font-extrabold text-[#142d60]">{row.total}</p></div>)}</div></section>
    </div>
  );
}
