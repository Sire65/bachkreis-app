// 🎄 Bachkreis-Adventskalender (0.41.0, nach KC-CLUB-ADVENTSKALENDER / -ADVENT-2026 / -ADVENT-UEBERRASCHUNG, für ein Jugendorchester umgedacht):
// 24 Türchen vom 1. bis 24. Dezember, vier Sorten im Wechsel – 🎵 Weihnachtslied zum Anhören (gemeinfreie Melodien, selbst erzeugter Klang),
// 🧩 Musikrätsel, ✂️ Basteln, 🍪 Leckerei – an den Adventssonntagen und Nikolaus etwas Besonderes, am 24. der Weihnachtsgruß mit „Stille Nacht“.
// Frühere Türchen lassen sich nachholen, spätere sind zu. Bis 30.11. bleibt alles eine Überraschung (nur die Leitung sieht eine Vorschau).
// Reine Daten und Funktionen (getestet in tests/advent.test.mjs); geöffnete Türchen merkt sich das Gerät, nichts geht an den Server.
export const LIEDER = {
  morgen: { t: "Morgen kommt der Weihnachtsmann", von: "Melodie: französisches Volkslied (18. Jh.), Text: Hoffmann von Fallersleben 1835", noten: "C4:1 C4:1 G4:1 G4:1 A4:1 A4:1 G4:2 F4:1 F4:1 E4:1 E4:1 D4:1 D4:1 C4:2" },
  tannenbaum: { t: "O Tannenbaum", von: "Volksweise, Text: Ernst Anschütz 1824", noten: "C4:1 F4:.75 F4:.25 F4:1.5 G4:.5 A4:.75 A4:.25 A4:1.5 A4:.5 G4:.5 A4:.5 A#4:1 E4:1 G4:1 F4:2" },
  jingle: { t: "Jingle Bells", von: "James Lord Pierpont 1857", noten: "E4:1 E4:1 E4:2 E4:1 E4:1 E4:2 E4:1 G4:1 C4:1.5 D4:.5 E4:4 F4:1 F4:1 F4:1.5 F4:.5 F4:1 E4:1 E4:1 E4:.5 E4:.5 E4:1 D4:1 D4:1 E4:1 D4:2 G4:2" },
  merry: { t: "We Wish You a Merry Christmas", von: "Englisches Volkslied (16. Jh.)", noten: "D4:1 G4:1 G4:.5 A4:.5 G4:.5 F#4:.5 E4:1 E4:1 E4:1 A4:1 A4:.5 B4:.5 A4:.5 G4:.5 F#4:1 D4:1 D4:1 B4:1 B4:.5 C5:.5 B4:.5 A4:.5 G4:1 E4:1 D4:.5 D4:.5 E4:1 A4:1 F#4:1 G4:2" },
  joy: { t: "Freue dich, Welt (Joy to the World)", von: "Melodie nach Händel, bearbeitet von Lowell Mason 1839", noten: "C5:1.5 B4:.5 A4:1.5 G4:.5 F4:1.5 E4:1 D4:1 C4:3" },
  froehliche: { t: "O du fröhliche", von: "Sizilianische Volksweise, Text: Johannes Daniel Falk 1816", noten: "G4:2 A4:2 G4:1.5 F4:.5 E4:1 F4:1 G4:2 A4:2 G4:1.5 F4:.5 E4:1 F4:1 G4:2 G4:2 A4:2 B4:2 C5:2 B4:2 A4:2 G4:4" },
  stille: { t: "Stille Nacht, heilige Nacht", von: "Franz Xaver Gruber 1818, Text: Joseph Mohr", noten: "G4:1.5 A4:.5 G4:1 E4:3 G4:1.5 A4:.5 G4:1 E4:3 D5:2 D5:1 B4:3 C5:2 C5:1 G4:3" },
};
const lied = (k, text) => ({ sorte: "lied", sym: "🎵", lied: k, titel: LIEDER[k].t, text });
const raetsel = (frage, antwort, tipp) => ({ sorte: "raetsel", sym: "🧩", titel: "Musikrätsel", frage, antwort, tipp });
const basteln = (titel, material, schritte, tipp) => ({ sorte: "basteln", sym: "✂️", titel, material, schritte, tipp });
const lecker = (titel, zutaten, schritte, tipp) => ({ sorte: "lecker", sym: "🍪", titel, zutaten, schritte, tipp });
export const TUEREN = {
  1: lied("morgen", "Das erste Türchen! Zum Mitspielen: die Melodie steht auf den Tönen C–G–A – probier sie auf deinem Instrument."),
  2: raetsel("Wie viele Teile (Kantaten) hat Bachs Weihnachtsoratorium?", "6 – Bach schrieb sie 1734 für die sechs Feiertage von Weihnachten bis Epiphanias.", "Es sind so viele wie Saiten an einer Gitarre."),
  3: basteln("Notenschlüssel-Stern", "alte Notenblätter (Kopien), Schere, Kleber, Faden", ["Aus Notenpapier 8 gleich breite Streifen (2 × 20 cm) schneiden.", "Je zwei Streifen über Kreuz kleben.", "Die vier Kreuze sternförmig aufeinanderlegen und in der Mitte festkleben.", "Einen Faden durchziehen – fertig ist der Fensterschmuck."], "Mit Goldstift einen Violinschlüssel in die Mitte malen."),
  4: lecker("Notenschlüssel-Kekse", "250 g Mehl, 125 g Butter, 80 g Zucker, 1 Ei, Zuckerguss", ["Teig kneten und 30 Minuten kühlen.", "Dünn ausrollen und Notenschlüssel und Achtelnoten ausschneiden (Schablone aus Pappe).", "Bei 180 °C etwa 10 Minuten backen.", "Mit Zuckerguss Notenlinien malen."], "Schablonen gibt es auch zum Ausdrucken – einfach eine Note groß malen und ausschneiden."),
  5: lied("tannenbaum", "Ein Lied, das jedes Orchester kennt. Kannst du heraushören, in welcher Tonart es hier klingt? (F-Dur)"),
  6: { sorte: "nikolaus", sym: "🎅", titel: "Nikolaus-Quiz", text: "Heute ist Nikolaus! Teste dein Musikwissen im Quiz – wer alle Fragen richtig hat, darf sich etwas Süßes gönnen.", knopf: ["🧠 Zum Quiz", "quiz"] },
  7: raetsel("Welches Streichinstrument ist das tiefste im Orchester?", "Der Kontrabass – er ist größer als die meisten Musikerinnen und Musiker, die ihn spielen.", "Man spielt es meistens im Stehen."),
  8: basteln("Mini-Geige als Christbaumschmuck", "Pappe, brauner Bastelkarton, Wolle oder Nähgarn, Kleber", ["Aus Pappe eine Geigenform (ca. 8 cm) ausschneiden – zweimal.", "Mit braunem Karton bekleben, f-Löcher aufmalen.", "Vier Fäden als Saiten von oben nach unten kleben.", "Aufhängen – vielleicht an den Weihnachtsbaum zu Hause?"], "Für ein Cello einfach doppelt so groß."),
  9: lecker("Bratapfel mit Nüssen", "4 Äpfel, Nüsse, Rosinen, 2 EL Honig, Zimt", ["Äpfel waschen, Kerngehäuse ausstechen.", "Nüsse, Rosinen, Honig und Zimt mischen und einfüllen.", "Bei 180 °C 25 Minuten backen.", "Mit Vanillesoße warm essen."], "Duftet wie eine ganze Weihnachtsprobe!"),
  10: lied("jingle", "„Jingle Bells“ war eigentlich ein Lied für Thanksgiving – heute klingt es überall zu Weihnachten."),
  11: raetsel("Was bedeutet „Adagio“?", "Langsam, ruhig – auf Italienisch „ad agio“: „mit Ruhe“.", "Das Gegenteil wäre Allegro."),
  12: basteln("Glockenspiel aus Gläsern", "6 gleiche Gläser, Wasser, Löffel, Lebensmittelfarbe", ["Gläser in eine Reihe stellen.", "Unterschiedlich viel Wasser einfüllen – mehr Wasser = tieferer Ton.", "Mit dem Löffel anschlagen und mit dem Stimmgerät der App nachstimmen.", "Jetzt „Morgen kommt der Weihnachtsmann“ spielen!"], "Etwas Farbe ins Wasser – dann sieht man die Töne."),
  13: { sorte: "advent", sym: "🕯️", titel: "3. Advent: Wunschkonzert", text: "Welches Weihnachtslied sollen wir nächstes Jahr spielen? Schreib deinen Wunsch als Vorschlag – die anderen können ihn unterstützen.", knopf: ["💡 Vorschlag machen", "vorschlaege"] },
  14: lecker("Kinderpunsch", "1 l Früchtetee, 0,5 l Apfelsaft, 0,5 l Orangensaft, 1 Zimtstange, 2 Nelken, Honig", ["Tee kochen und ziehen lassen.", "Säfte und Gewürze dazugeben.", "Langsam erwärmen (nicht kochen).", "Mit Honig süßen – heiß, aber nicht zu heiß servieren."], "Perfekt nach einer kalten Probe."),
  15: lied("merry", "Dieses Lied wird seit über 400 Jahren gesungen – damals zogen Sängerinnen und Sänger von Haus zu Haus."),
  16: raetsel("Wie heißen die Noten auf den Linien im Violinschlüssel, von unten nach oben?", "E – G – H – D – F. Merksatz: „Es geht hurtig durch Fleiß.“", "Es sind fünf Linien."),
  17: basteln("Tannenbaum aus Notenpapier", "Notenpapier, grüner Karton, Stern-Aufkleber, Kleber", ["Notenpapier in Streifen schneiden, unten lang, oben kurz.", "Wie eine Ziehharmonika falten.", "Von unten nach oben auf grünen Karton kleben.", "Oben einen Stern drauf – fertig ist die Weihnachtskarte."], "Schön als Gruß an die Großeltern."),
  18: lecker("Schoko-Crossies", "200 g Schokolade, 100 g Cornflakes, Mandelstifte", ["Schokolade im Wasserbad schmelzen.", "Cornflakes und Mandeln unterheben.", "Kleine Häufchen auf Backpapier setzen.", "Kühl stellen – nach einer Stunde fest."], "Mit weißer Schokolade sehen sie aus wie Schneebälle."),
  19: raetsel("Wer komponierte das Ballett „Der Nussknacker“?", "Peter Tschaikowsky (1892) – der „Tanz der Zuckerfee“ wird mit einer Celesta gespielt.", "Ein russischer Komponist."),
  20: { sorte: "advent", sym: "🕯️", titel: "4. Advent: Bach zu Weihnachten", text: "„Jauchzet, frohlocket!“ – so beginnt Bachs Weihnachtsoratorium. Pauken und Trompeten eröffnen es; damals eine Sensation, denn mit Pauken fing kaum ein Kirchenstück an. Hör es dir heute einmal an – der Bachkreis trägt Bach ja im Namen!" },
  21: lied("joy", "Die Melodie geht genau die Tonleiter hinunter: C – H – A – G – F – E – D – C. Spiel sie nach!"),
  22: basteln("Weihnachtskarte mit Notengruß", "Klappkarte, Buntstifte, Lineal", ["Fünf Notenlinien auf die Karte zeichnen.", "Die ersten Töne von „Stille Nacht“ hineinmalen: G – A – G – E.", "Darunter: „Frohe Weihnachten!“", "An jemanden aus dem Orchester verschenken."], "Wer die Noten erkennt, kann sie gleich spielen."),
  23: lied("froehliche", "Noch einmal schlafen! Dieses Lied wurde für Waisenkinder in Weimar geschrieben."),
  24: { sorte: "heiligabend", sym: "🎄", titel: "Frohe Weihnachten!", lied: "stille", text: "Der ganze Bachkreis wünscht dir und deiner Familie frohe Weihnachten und ein gutes neues Jahr – danke für jede Probe, jedes Konzert und jeden Ton in diesem Jahr! 🎻🎺🥁" },
};
// Sichtbar: im Dezember für alle (bis 6. Januar), vorher nur die Leitung zur Vorschau (Überraschung)
export function adventSichtbar(heute = new Date(), leitung = false) {
  const m = heute.getMonth(), t = heute.getDate();
  return m === 11 || (m === 0 && t <= 6) || leitung;
}
// Ein Türchen darf geöffnet werden, wenn sein Tag gekommen ist (frühere nachholen ja, spätere nein); die Leitung darf in der Vorschau alles
export function tuerOffenBar(tag, heute = new Date(), vorschau = false) {
  if (vorschau) return true;
  const m = heute.getMonth(), t = heute.getDate();
  if (m === 0) return true; // im Januar alle
  return m === 11 && tag <= t;
}
export const heutigesTuerchen = (heute = new Date()) => (heute.getMonth() === 11 && heute.getDate() <= 24 ? heute.getDate() : null);
// Noten „C4:1 G#4:.5“ → [[midi, schläge]]
export function melodie(noten) {
  const st = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11, H: 11 };
  return String(noten).trim().split(/\s+/).map((x) => { const m = x.match(/^([A-H])(#|b)?(\d):([\d.]+)$/); if (!m) return null;
    return [12 * (Number(m[3]) + 1) + st[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0), Number(m[4])]; }).filter(Boolean);
}
// Reihenfolge der Türchen auf dem Kalender (durcheinander wie ein echter Adventskalender, 24 groß am Ende)
export const ANORDNUNG = [7, 15, 2, 21, 11, 4, 18, 9, 13, 1, 23, 6, 16, 10, 20, 3, 12, 19, 5, 14, 22, 8, 17, 24];
