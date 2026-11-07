import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-md px-4 py-20 text-center">
      <h1 className="text-3xl font-bold">Fant ikke siden</h1>
      <p className="mt-2 text-muted">Lenken kan være feil, eller delingen er trukket tilbake.</p>
      <Link href="/" className="mt-6 inline-block text-accent underline">Til forsiden</Link>
    </main>
  );
}
