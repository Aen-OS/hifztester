const ARABIC_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];

function toArabicNumeral(n) {
  return String(n)
    .split("")
    .map((d) => ARABIC_DIGITS[d])
    .join("");
}

export function endOfVerse(verseNumber) {
  return ` \u06DD${toArabicNumeral(verseNumber)}`;
}
