import { TvCodeForm } from "./TvCodeForm";

export const metadata = { title: "Vis kamp på TV" };

export default function TvEntryPage() {
  return (
    <main className="fixed inset-0 flex flex-col items-center justify-center gap-6 bg-black p-6 text-center text-white">
      <h1 className="text-4xl font-black sm:text-6xl">Dartkveld</h1>
      <p className="max-w-xl text-xl text-white/70 sm:text-2xl">
        Skriv inn kampkoden du ser på telefonen, så vises tavla her. Du trenger ikke logge inn.
      </p>
      <TvCodeForm />
    </main>
  );
}
