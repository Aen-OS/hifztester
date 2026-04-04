import GameCard from "@/components/GameCard";
import Image from "next/image";

export default function Home() {
  return (
    <div className="mx-auto flex min-h-svh max-w-[680px] flex-col items-center justify-center px-4 py-16">
      <div className="text-center">
        {/* <h1 className="text-7xl tracking-tight font-rakkas text-emerald-700">إتقان</h1>
        <p className="mt-2 text-lg text-muted font-body">
          Quran memorization tools
        </p> */}
        <Image
          src="/itqaanlogo.png"
          alt="Itqaan Logo"
          width={200}
          height={200}
          className="mx-auto"
          loading="eager"
        />
        <p className="mt-2 text-lg text-muted font-body">
          Quran memorization tools
        </p>
      </div>
      <div className="mt-12 w-full">
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
        <div className="mt-3 flex justify-center">
          <div className="w-[calc(50%-6px)]">
            <GameCard
              title="Ma'naMatch"
              description="Match the translation to the Arabic verse."
              href="/manamatch"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
