import GameCard from "@/components/GameCard";

export default function Home() {
  return (
    <div className="mx-auto max-w-[480px] px-4 py-16">
      <div className="text-center">
        <h1 className="text-7xl tracking-tight font-rakkas text-emerald-700">إتقان</h1>
        <p className="mt-2 text-lg text-muted font-body">
          Quran memorization tools
        </p>
      </div>
      <div className="mt-12 rounded-lg border border-border bg-surface p-4">
        <div className="grid grid-cols-2 gap-3">
          <GameCard
            title="AyahFlow"
            description="Given an ayah, guess what comes next."
            href="/ayahflow"
          />
          <GameCard
            title="SurahSense"
            description="Identify the surah from a clue."
            href="/surahsense"
          />
          <GameCard
            title="KalamQuest"
            description="Fill in the missing words or ayahs."
            href="/kalamquest"
          />
          <GameCard
            title="TartibLock"
            description="Arrange scrambled blocks in order."
            href="/tartiblock"
          />
        </div>
      </div>
    </div>
  );
}
