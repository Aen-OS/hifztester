# Understand the code

## fetch-verses.js

## game-engine.js

getNextVerseKey / getPrevVerseKey (lines 122-134)  
 Navigate between verses using the chapter:verse key format. If you're at the last ayah of a surah, it wraps to the first ayah of
the next surah (and vice versa for previous). Wraps around from  
 surah 114 back to 1.

shuffle (line 136)

Standard Fisher-Yates in-place shuffle. Used everywhere randomness is needed.
createPromptQueue (line 144)  
 Builds the list of verses the player will be quizzed on: 1. Removes boundary keys (last ayah of each surah in scope) — these
can't have a valid "next" ayah within the fetched data 2. Shuffles the rest into a random order

Every eligible verse appears exactly once per cycle. When the queue
is exhausted, the play page calls this again for a fresh shuffle. buildVerseMap (line 150)  
 Creates a Map<verseKey, verseObject> for O(1) lookups by key. Used by buildQuestion to fetch the correct answer verse.

generateDistractors (line 158)

Picks 3 wrong answers based on difficulty:

- Hard: Prioritizes verses within ±5 ayahs of the correct answer
  (same surah) — very similar-looking text - Medium: Prioritizes verses from the same surah but >6 ayahs away
- Easy: Picks randomly from all scope verses  


It uses a tiered fallback (lines 193-198). Hard mode tries hard  
 candidates first, then falls back to medium, then easy — so if there aren't enough nearby verses, it still fills 3 distractors.

buildQuestion (line 216)

Assembles a complete question:

1. Computes the correct answer key using getNextVerseKey or
   getPrevVerseKey based on direction 2. Looks up the correct verse in the verse map
2. Calls generateDistractors to get 3 wrong choices
3. Shuffles the correct answer in with the distractors and returns the full question object

## quran-client.js
