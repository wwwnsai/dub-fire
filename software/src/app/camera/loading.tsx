import Layout from "@/components/Layout";

export default function Loading() {
  return (
    <Layout>
      <div className="mx-auto mt-2 grid max-w-4xl gap-6 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="h-10 w-28 rounded-full bg-white shadow-[0px_4px_10px_rgba(0,0,0,0.10)]" />
          <div className="h-10 w-32 rounded-full bg-white shadow-[0px_4px_10px_rgba(0,0,0,0.10)]" />
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-[0px_4px_10px_rgba(0,0,0,0.12)]">
          <div className="mb-2 h-5 w-40 rounded bg-slate-200" />
          <div className="aspect-video w-full rounded-2xl bg-black/80" />
        </div>
      </div>
    </Layout>
  );
}
