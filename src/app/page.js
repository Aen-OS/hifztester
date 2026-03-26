import GameCard from "@/components/GameCard";

export default function Home() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">Rabt</h1>
        <p className="mt-2 text-lg text-gray-500">
          Quran memorization tools
        </p>
      </div>
      <div className="mt-12 grid gap-4">
        <GameCard
          title="AyahFlow"
          description="Given an ayah, guess what comes next. Test your memorization with multiple choice."
          href="/ayahflow"
        />
      </div>
    </div>
  );
}
