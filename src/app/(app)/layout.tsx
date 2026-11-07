import { Header } from "@/components/Header";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">{children}</main>
    </>
  );
}
