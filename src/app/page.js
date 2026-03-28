import GameCard from "@/components/GameCard";

export default function Home() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <div className="text-center">
        <h1 className="text-7xl font-bold tracking-tight font-rakkas">إتقان</h1>
        <p className="mt-2 text-lg text-gray-500 font-body">
          Quran memorization tools
        </p>
      </div>
      <div className="mt-12 grid gap-4">
        <GameCard
          title="AyahFlow"
          description="Given an ayah, guess what comes next. Test your memorization with multiple choice."
          href="/ayahflow"
        />
        <GameCard
          title="SurahSense"
          description="Identify the surah from a page, ayah, group of ayaat, or its summary."
          href="/surahsense"
        />
      </div>
      <div>
        <div className="mt-12 w-full rounded-xl border border-gray-200 p-4 text-left hover:border-gray-400 hover:bg-gray-50">
          <h3 className="font-bold">Roadmap</h3>
          <div className="">
            <h4>Phase 1</h4>
            <p></p>
          </div>
          <div>
            <h4>Phase 2</h4>
          </div>
          <div>
            <h4>Phase 3</h4>
          </div>
        </div>
      </div>
    </div>
  );
}
