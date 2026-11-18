// 🎼 0.79.5 Freie Noten zu den Bach-Aufnahmen (Mutopia Project, CC BY-SA – Quellen: noten/bach/QUELLEN.md); dazu eigene Noten aus dem
// Notenarchiv, gefunden über die BWV-Nummer (Anzeige: js/app/buehne.js bachNotenHtml) im Werkverzeichnis (nur was die Person dort sehen darf)
export const BACH_NOTEN = {
  air: { teile: [["Partitur", "air-partitur.pdf"], ["Violine 1", "air-violine1.pdf"], ["Violine 2", "air-violine2.pdf"], ["Bratsche", "air-bratsche.pdf"], ["Continuo (Cello/Bass)", "air-continuo.pdf"]], quelle: "Notensatz: Jeff Covey nach der Bach-Gesellschafts-Ausgabe · Mutopia Project · CC BY-SA 3.0" },
  violinkonzert: { teile: [["Solo-Violine (alle 3 Sätze)", "violinkonzert-solovioline.pdf"]], quelle: "Notensatz: Federico Bruni, Javier Ruiz-Alma nach Breitkopf & Härtel · Mutopia Project · CC BY-SA 4.0" },
  wachet: { teile: [["Orgelfassung BWV 645 (Bachs eigene Bearbeitung des Chorals)", "wachet-auf-orgel.pdf"]], quelle: "Notensatz: Bart Golsteijn nach der Bach-Gesellschafts-Ausgabe · Mutopia Project · CC BY-SA 2.5" },
};
export const bwvPasst = (werkverzeichnis, bwv) => new RegExp(`\\bBWV\\s*${bwv}(?![\\d])`, "i").test(String(werkverzeichnis || ""));
