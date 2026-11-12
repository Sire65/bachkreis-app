// 🐞🍀 Marienkäfer und Glücksklee (0.42.0): Sprüche und die Reihenfolge der Überraschungen – reine Funktionen (getestet)
export const SPRUECHE_KAEFER = ["🐞 Glück ist, wenn das ganze Orchester im selben Takt atmet.", "🐞 Ein kleiner Käfer, ein großer Wunsch: Viel Freude beim Üben!", "🐞 Heute klingt alles ein bisschen schöner.",
  "🐞 Auch die längste Partitur beginnt mit einer einzigen Note.", "🐞 Wer übt, hat Glück – und wer Glück hat, übt trotzdem.", "🐞 Du bringst den Bachkreis zum Klingen!", "🐞 Psst … der Marienkäfer hat dir gerade zugehört. Er fand es toll.", "🐞 Glückwunsch – nur jeder 50. Start sieht mich!"];
export const SPRUECHE_KLEE = ["🍀 Vier Blätter – vier Saiten – ein Glück!", "🍀 Möge dein Bogen nie quietschen.", "🍀 Heute triffst du jeden Ton.", "🍀 Glück ist ein Akkord aus lauter Freunden.", "🍀 Der Wind hat dir Glück ins Notenheft geweht.",
  "🍀 Mehr Takt als Pech – das wünscht dir der Klee.", "🍀 Ein Kleeblatt für die nächste Probe!", "🍀 Atme tief ein – und spiel einfach los.", "🍀 Das Glück spielt heute in deinem Register.", "🍀 Fortissimo-Glück für dich!",
  "🍀 Kleine Pausen sind auch Musik.", "🍀 Wer lächelt, spielt schöner.", "🍀 Heute ist ein guter Tag für Dur.", "🍀 Ein Glücksklee – selten wie ein perfekt gestimmtes Orchester.", "🍀 Danke, dass du dabei bist!"];
export const zufall = (l) => l[Math.floor(Math.random() * l.length)];
// welche Überraschung beim n-ten Start? (Käfer vor Klee vor Fee) – getestet
export function ueberraschung(n, e = {}) {
  if (n > 0 && n % 50 === 0 && e.kaefer !== false) return "kaefer";
  if (n > 0 && n % 25 === 0 && e.klee !== false) return "klee";
  if (n > 0 && n % 20 === 0 && e.fee !== false) return "fee";
  return null;
}
