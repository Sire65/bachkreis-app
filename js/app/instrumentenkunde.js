// 🎻 Instrumentenkunde: Instrument antippen → eine Figur mit DEINEM Gesicht hält es, spielt es vor (selbst erzeugter Klang),
// dazu Steckbrief (Tonumfang, Schlüssel, Stimmung), worauf man achten sollte, Pflege, Einstieg – und wer im Bachkreis es spielt.
import { S, VIEWS, db, zeige, kopf, name, istVerwalter } from "./zustand.js";
import { esc, AKTIONEN, toast } from "../kern/ui.js";
import { liste, hole } from "../kern/daten.js";
import { instrumentSpielen, midi } from "../kern/musik.js";
import { INSTRUMENT_GRUPPEN, INVENTAR_ABGANG } from "../kern/schema.js";
import { merkmale, gesichtSvg, gesicht } from "./gesichter.js";

// Haltung: kinn · zwischen (Cello) · bass · quer (Flöte) · gerade · schraeg (Fagott) · vorn (Trompete) · zug (Posaune) · horn · tuba · pauke · trommel · harfe · klavier
export const LEHRE = [
  { id: "violine", name: "Violine (Geige)", sym: "🎻", familie: "streicher", finde: /violin|geige/i, klang: "violine", umfang: ["G3", "A7"], lage: 72, haltung: "kinn", farbe: "#a0522d",
    schluessel: "Violinschlüssel", stimmung: "G – D – A – E (Quinten)", steckbrief: "4 Saiten · Fichte & Ahorn · ca. 60 cm, 400 g",
    kurz: "Das höchste Streichinstrument und meistens die Melodie im Orchester. Im Bachkreis gibt es 1. und 2. Violinen.",
    beachten: ["Geige auf die linke Schulter, Kinn locker auflegen – nicht festklemmen", "Bogen mit lockerem, rundem Handgelenk führen, Daumen leicht gebeugt", "Bogen gerade zwischen Griffbrett und Steg streichen", "Vor jeder Probe stimmen – das A kommt von der Oboe"],
    pflege: ["Nach dem Spielen Kolophonium-Staub mit einem weichen Tuch abwischen", "Bogenhaare nach dem Spielen entspannen", "Nie in der Sonne oder im kalten Auto liegen lassen"],
    einstieg: "Ab etwa 6 Jahren – Kindergrößen 1/8 bis 3/4, ab ca. 11 Jahren 4/4.", wussten: "Die Saiten waren früher aus Schafsdarm – heute meist aus Kunststoff oder Stahl." },
  { id: "viola", name: "Viola (Bratsche)", sym: "🎻", familie: "streicher", finde: /viola|bratsche/i, klang: "viola", umfang: ["C3", "E6"], lage: 67, haltung: "kinn", farbe: "#8b4513",
    schluessel: "Bratschenschlüssel (Altschlüssel)", stimmung: "C – G – D – A", steckbrief: "4 Saiten · etwas größer als die Geige · 38–42 cm Korpus",
    kurz: "Klingt dunkler und wärmer als die Geige und füllt die Mitte des Streicherklangs.",
    beachten: ["Gehalten wie die Geige – wegen der Größe den Arm etwas weiter strecken", "Mehr Bogengewicht, damit die dicken Saiten gut klingen", "Den Altschlüssel üben: das mittlere C liegt auf der Mittellinie"],
    pflege: ["Wie die Geige: abwischen, Bogen entspannen", "Kinnhalter und Schulterstütze ab und zu prüfen"], einstieg: "Viele wechseln von der Geige – ab ca. 10 Jahren gut möglich.", wussten: "Der Altschlüssel heißt so, weil er früher für die Altstimme im Chor benutzt wurde." },
  { id: "cello", name: "Violoncello", sym: "🎻", familie: "streicher", finde: /cello/i, klang: "cello", umfang: ["C2", "A5"], lage: 48, haltung: "zwischen", farbe: "#7a3b12",
    schluessel: "Bassschlüssel (hoch: Tenor-/Violinschlüssel)", stimmung: "C – G – D – A (eine Oktave unter der Bratsche)", steckbrief: "4 Saiten · Stachel am Boden · ca. 120 cm, 3 kg",
    kurz: "Sitzend gespielt, mit einem Klang, der der menschlichen Stimme sehr nah ist – von tiefem Bass bis zu singenden Melodien.",
    beachten: ["Vorne auf der Stuhlkante sitzen, Füße flach auf dem Boden", "Cello zwischen den Knien, oberer Rand an der Brust", "Stachel so lang, dass der C-Wirbel neben dem linken Ohr ist", "Stachelhalter benutzen – sonst rutscht er auf glattem Boden"],
    pflege: ["Im gepolsterten Kasten oder Gigbag transportieren", "Stachel einfahren, bevor man es ablegt", "Nie an die Heizung stellen"], einstieg: "Ab etwa 6 Jahren mit 1/4- oder 1/2-Cello.", wussten: "Der Stachel wurde erst um 1860 üblich – davor hielt man das Cello mit den Beinen." },
  { id: "kontrabass", name: "Kontrabass", sym: "🎻", familie: "streicher", finde: /kontrabass/i, klang: "bass", umfang: ["E1", "G4"], lage: 36, haltung: "bass", farbe: "#6b3410",
    schluessel: "Bassschlüssel (klingt eine Oktave tiefer)", stimmung: "E – A – D – G (Quarten)", steckbrief: "4 Saiten · bis 1,90 m · 10 kg",
    kurz: "Das Fundament des Orchesters: tief, warm, gestrichen oder gezupft (pizzicato).",
    beachten: ["Stehend oder auf einem hohen Hocker spielen", "Instrument leicht an den Körper lehnen", "Beim Zupfen mit der Seite des Zeigefingers, nicht mit der Fingerspitze", "Französischer oder deutscher Bogen – im Unterricht festlegen"],
    pflege: ["Beim Tragen am Hals und am Rand fassen, nie am Steg", "Im Auto gut abpolstern", "Kleine Risse sofort der Leitung melden"], einstieg: "Ab etwa 10 Jahren mit 1/4- oder 1/2-Bass.", wussten: "Er klingt eine Oktave tiefer, als er notiert ist – sonst bräuchte man viele Hilfslinien." },
  { id: "floete", name: "Querflöte", sym: "🪈", familie: "holz", finde: /querfl|flöte|floete/i, klang: "floete", umfang: ["C4", "C7"], lage: 72, haltung: "quer", farbe: "#c0c0c0",
    schluessel: "Violinschlüssel", stimmung: "in C", steckbrief: "aus Metall, aber ein Holzblasinstrument · 67 cm · ca. 400 g",
    kurz: "Hell, beweglich und manchmal wie ein Vogel – die Flöte spielt oft hohe Melodien und schnelle Läufe.",
    beachten: ["Über das Mundloch blasen wie über eine Flasche – nicht hinein", "Schultern locker, Flöte waagerecht nach rechts", "Ruhig und tief atmen – vor langen Phrasen rechtzeitig Luft holen"],
    pflege: ["Nach dem Spielen mit dem Putzstab und Tuch trocknen", "Klappen nie verbiegen – beim Zusammenstecken nicht an den Klappen drehen", "Fingerabdrücke mit einem Silbertuch abwischen"], einstieg: "Ab etwa 8 Jahren, für Kleine gibt es Flöten mit gebogenem Kopfstück.", wussten: "Sie zählt zu den Holzbläsern, weil die ersten Querflöten wirklich aus Holz waren." },
  { id: "oboe", name: "Oboe", sym: "🎷", familie: "holz", finde: /oboe/i, klang: "oboe", umfang: ["B3", "A6"], lage: 67, haltung: "gerade", farbe: "#2b1b12",
    schluessel: "Violinschlüssel", stimmung: "in C – sie gibt dem Orchester das A zum Stimmen", steckbrief: "Doppelrohrblatt · Grenadillholz · 65 cm",
    kurz: "Ein näselnder, singender Klang, den man im Orchester sofort heraushört. Vor jeder Probe gibt sie das A.",
    beachten: ["Das Rohr vor dem Spielen kurz anfeuchten", "Lippen über die Zähne legen und das Rohr nur leicht umschließen", "Wenig Luft, aber mit Druck – Pausen machen, das ist anstrengend"],
    pflege: ["Rohre in einer Rohrdose aufbewahren", "Nach dem Spielen gründlich durchziehen", "Kälte und Hitze vermeiden – Holz kann reißen"], einstieg: "Ab etwa 10 Jahren, oft nach Blockflöte.", wussten: "Gute Oboisten bauen ihre Rohre oft selbst." },
  { id: "klarinette", name: "Klarinette", sym: "🎷", familie: "holz", finde: /klarinette/i, klang: "klarinette", umfang: ["D3", "Bb6"], lage: 62, haltung: "gerade", farbe: "#1f1f1f",
    schluessel: "Violinschlüssel (klingt in B einen Ton tiefer)", stimmung: "in B (oder A)", steckbrief: "einfaches Rohrblatt · 5 Teile · ca. 66 cm",
    kurz: "Sehr großer Tonumfang: unten dunkel und weich, oben hell und strahlend.",
    beachten: ["Blatt mit der Blattschraube gerade auf das Mundstück", "Unterlippe leicht über die Zähne, Mundwinkel fest", "Daumen rechts trägt das Gewicht – Daumenstütze nutzen"],
    pflege: ["Blatt nach dem Spielen abnehmen und trocken lagern", "Mit dem Durchziehwischer trocknen", "Korken ab und zu mit Korkfett einreiben"], einstieg: "Ab etwa 9 Jahren, Kinder oft mit C-Klarinette.", wussten: "Mozart liebte die Klarinette und schrieb ihr ein berühmtes Konzert." },
  { id: "fagott", name: "Fagott", sym: "🎷", familie: "holz", finde: /fagott/i, klang: "fagott", umfang: ["Bb1", "E5"], lage: 46, haltung: "schraeg", farbe: "#7b3f1e",
    schluessel: "Bassschlüssel (hoch: Tenorschlüssel)", stimmung: "in C", steckbrief: "Doppelrohrblatt · fast 2,60 m Rohr, gefaltet auf 1,35 m",
    kurz: "Der Bass der Holzbläser – kann ernst und tief, aber auch sehr lustig klingen.",
    beachten: ["Mit Gurt oder Sitzriemen spielen – nie das Gewicht nur mit den Händen halten", "Das S-Bogen-Rohr vorsichtig aufstecken", "Viele Daumenklappen: anfangs langsam üben"],
    pflege: ["Rohr in der Dose, nach dem Spielen gut trocknen", "Teile nicht verkanten", "Flügel- und Stiefelteil gründlich auswischen"], einstieg: "Ab etwa 10 Jahren, für Kinder gibt es das kleinere Fagottino.", wussten: "Der Großvater in „Peter und der Wolf“ wird vom Fagott gespielt." },
  { id: "horn", name: "Waldhorn", sym: "📯", familie: "blech", finde: /horn/i, klang: "horn", umfang: ["F2", "F5"], lage: 55, haltung: "horn", farbe: "#d4a017",
    schluessel: "Violinschlüssel (in F)", stimmung: "in F oder Doppelhorn F/B", steckbrief: "ca. 3,7 m gewundenes Rohr · Ventile · Trichter nach hinten",
    kurz: "Warm und rund – das Horn verbindet Holz- und Blechbläser.",
    beachten: ["Rechte Hand locker in den Trichter – sie formt den Ton", "Lippen summen auf dem Mundstück (Buzzing)", "Vor dem Spielen einblasen, Töne treffen braucht Übung"],
    pflege: ["Kondenswasser über die Wasserklappen ablassen", "Ventile regelmäßig ölen", "Einmal im Jahr baden (lauwarmes Wasser)"], einstieg: "Ab etwa 9 Jahren, oft mit leichtem Kinderhorn.", wussten: "Früher war es ein Jagdhorn – darum heißt es Waldhorn." },
  { id: "trompete", name: "Trompete", sym: "🎺", familie: "blech", finde: /trompete/i, klang: "trompete", umfang: ["F#3", "D6"], lage: 67, haltung: "vorn", farbe: "#e2b007",
    schluessel: "Violinschlüssel (in B)", stimmung: "in B oder C", steckbrief: "3 Ventile · ca. 1,4 m Rohr · 1 kg",
    kurz: "Strahlend und festlich – die Trompete spielt Fanfaren, Signale und glänzende Melodien.",
    beachten: ["Mundstück mittig auf die Lippen, nicht drücken", "Mit Zwerchfell-Stütze blasen, nicht pressen", "Pausen einhalten – Lippen werden schnell müde"],
    pflege: ["Wasser über die Wasserklappe ablassen", "Ventile ölen, Züge fetten", "Mundstück regelmäßig mit der Bürste reinigen"], einstieg: "Ab etwa 8 Jahren, wenn die Schneidezähne nachgewachsen sind.", wussten: "Schon die alten Ägypter hatten Trompeten – ohne Ventile." },
  { id: "posaune", name: "Posaune", sym: "🎺", familie: "blech", finde: /posaune/i, klang: "posaune", umfang: ["E2", "F5"], lage: 53, haltung: "zug", farbe: "#d9a400",
    schluessel: "Bassschlüssel (hoch: Tenorschlüssel)", stimmung: "in B", steckbrief: "Zug statt Ventilen · 7 Zugpositionen · ca. 1,8 kg",
    kurz: "Mit dem Zug kann sie Töne gleiten lassen (Glissando) – kräftig, aber auch ganz weich.",
    beachten: ["Linke Hand trägt das Instrument, rechte bewegt nur den Zug", "Die 7 Positionen nach Gehör finden", "Beim Zug-Ausfahren auf den Nachbarn achten!"],
    pflege: ["Zug regelmäßig mit Zugcreme oder -öl pflegen", "Zug nie fallen lassen – kleine Dellen verändern den Klang", "Innen ab und zu mit Wasser und Reinigungsschlange säubern"], einstieg: "Ab etwa 9 Jahren, wenn der Arm lang genug ist (sonst Kinderposaune).", wussten: "Posaunen spielten früher in Kirchen den Chor mit." },
  { id: "tuba", name: "Tuba", sym: "🎺", familie: "blech", finde: /tuba/i, klang: "tuba", umfang: ["D1", "F4"], lage: 36, haltung: "tuba", farbe: "#c99a06",
    schluessel: "Bassschlüssel", stimmung: "in F, B oder C", steckbrief: "4 Ventile · bis zu 6 m Rohr · 8–12 kg",
    kurz: "Das tiefste Blechblasinstrument – sie gibt dem Orchester ein kräftiges, rundes Fundament.",
    beachten: ["Im Sitzen spielen, Tuba auf dem Schoß oder einem Ständer", "Sehr viel Luft – langsam und tief einatmen", "Lippen locker lassen für die tiefen Töne"],
    pflege: ["Wasser über mehrere Klappen ablassen", "Ventile ölen", "Beim Tragen nicht am Schallbecher fassen"], einstieg: "Ab etwa 10 Jahren, Kinder beginnen oft mit Tenorhorn oder Euphonium.", wussten: "Würde man das Rohr gerade ziehen, wäre es so lang wie ein Kleinbus." },
  { id: "pauke", name: "Pauken", sym: "🥁", familie: "schlag", finde: /pauke/i, klang: "pauke", umfang: ["D2", "C4"], lage: 41, haltung: "pauke", farbe: "#b87333",
    schluessel: "Bassschlüssel", stimmung: "mit dem Pedal auf bestimmte Töne gestimmt", steckbrief: "Kupferkessel mit Fell · 2–5 Pauken je nach Stück",
    kurz: "Die einzigen Trommeln im Orchester mit richtigen Tönen – von leisem Grollen bis zum großen Donner.",
    beachten: ["Etwa eine Handbreit vom Rand anschlagen", "Schlägel locker zurückfedern lassen", "Mit der Hand abdämpfen, wenn der Ton aufhören soll", "Vor dem Stück leise nachstimmen"],
    pflege: ["Felle nie mit dem Fingernagel berühren", "Abdeckungen benutzen, Pedal nicht treten, wenn sie transportiert wird", "Schlägel trocken lagern"], einstieg: "Meist nach ein paar Jahren Schlagzeug- oder Klavierunterricht.", wussten: "Pauken wurden früher zu Pferd gespielt – bei der Reiterei." },
  { id: "schlagwerk", name: "Schlagwerk", sym: "🥁", familie: "schlag", finde: /schlagwerk|trommel|becken/i, klang: "trommel", umfang: [null, null], lage: 60, haltung: "trommel", farbe: "#8e8e8e",
    schluessel: "Schlagzeugschlüssel (ohne Tonhöhen)", stimmung: "kleine Trommel, Becken, Triangel, Glockenspiel …", steckbrief: "viele Instrumente – meistens spielt eine Person mehrere",
    kurz: "Rhythmus, Glanz und Effekte: kleine Trommel, Becken, Triangel, Tamburin, Xylophon und Glockenspiel.",
    beachten: ["Zählen, zählen, zählen – oft viele Takte Pause", "Instrumente vor der Probe in Reichweite aufbauen", "Becken nach dem Schlag mit der Kleidung abdämpfen"],
    pflege: ["Becken nicht stapeln ohne Filz dazwischen", "Felle sauber halten", "Kleinteile (Triangel, Klöppel) in die Kiste zurück"], einstieg: "Jederzeit – Rhythmusgefühl ist das Wichtigste.", wussten: "Die Triangel klingt so hell, weil eine Ecke offen ist." },
  { id: "harfe", name: "Harfe", sym: "🪕", familie: "tasten", finde: /harfe/i, klang: "harfe", umfang: ["Cb1", "G#7"], lage: 60, haltung: "harfe", farbe: "#c19a6b",
    schluessel: "Violin- und Bassschlüssel (zwei Systeme)", stimmung: "47 Saiten, 7 Pedale für die Halbtöne", steckbrief: "Konzertharfe · 1,80 m · ca. 35 kg",
    kurz: "Glitzernde Akkorde und Klangflächen – gezupft mit den Fingern beider Hände.",
    beachten: ["Die Harfe lehnt an der rechten Schulter", "Mit den Fingerkuppen zupfen, kleiner Finger spielt nicht", "Die roten Saiten sind die Cs, die blauen die Fs"],
    pflege: ["Vor jeder Probe stimmen – die Saiten verstimmen sich schnell", "Nicht in Zugluft oder Sonne stellen", "Nur mit Hülle und zu zweit transportieren"], einstieg: "Ab etwa 7 Jahren auf einer Hakenharfe.", wussten: "Die Harfe ist eines der ältesten Instrumente der Welt – über 4000 Jahre alt." },
  { id: "klavier", name: "Klavier", sym: "🎹", familie: "tasten", finde: /klavier|piano|flügel/i, klang: "klavier", umfang: ["A0", "C8"], lage: 60, haltung: "klavier", farbe: "#1b1b1b",
    schluessel: "Violin- und Bassschlüssel", stimmung: "88 Tasten · wohltemperiert", steckbrief: "Hämmer schlagen Saiten an · Flügel bis 2,70 m",
    kurz: "Kann Melodie und Begleitung gleichzeitig – im Orchester übernimmt es oft Akkorde oder besondere Farben.",
    beachten: ["Locker sitzen: Unterarme waagerecht zu den Tasten", "Finger rund, aus dem Arm spielen, nicht aus den Fingern drücken", "Pedal sparsam – sonst verschwimmt alles"],
    pflege: ["Tasten nur mit sauberen Händen spielen", "Deckel schließen gegen Staub", "Ein- bis zweimal im Jahr stimmen lassen"], einstieg: "Ab etwa 5 Jahren.", wussten: "Der volle Name ist „Pianoforte“ – es kann leise (piano) und laut (forte)." },
];

// ---------- Figur mit Gesicht und Instrument (viewBox 0 0 200 240) ----------
const HAUT = (m) => ["#f9dcc4", "#f1c27d", "#e0ac69", "#c68642", "#8d5524", "#5c3a1e"][m.haut % 6];
const arm = (pkt, haut) => `<polyline points="${pkt.map((p) => p.join(",")).join(" ")}" fill="none" stroke="#24242e" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${pkt[pkt.length - 1][0]}" cy="${pkt[pkt.length - 1][1]}" r="6.5" fill="${haut}"/>`;
const bogen = (x1, y1, x2, y2) => `<g class="bogen"><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#5b3a1a" stroke-width="3" stroke-linecap="round"/><line x1="${x1}" y1="${y1 + 3}" x2="${x2}" y2="${y2 + 3}" stroke="#f3ead8" stroke-width="1.6"/></g>`;
function figurSvg(l, m) {
  const haut = HAUT(m), sitzt = ["zwischen", "horn", "tuba", "harfe", "klavier", "schraeg"].includes(l.haltung), c = l.farbe;
  const beine = sitzt ? `<rect x="58" y="176" width="86" height="9" rx="3" fill="#6b4f3a"/><rect x="62" y="185" width="6" height="45" fill="#6b4f3a"/><rect x="134" y="185" width="6" height="45" fill="#6b4f3a"/>
      <path d="M78 168 L78 178 L60 178 L60 226" stroke="#24242e" stroke-width="15" fill="none" stroke-linejoin="round"/><path d="M122 168 L122 178 L140 178 L140 226" stroke="#24242e" stroke-width="15" fill="none" stroke-linejoin="round"/>
      <ellipse cx="56" cy="230" rx="11" ry="5" fill="#111"/><ellipse cx="144" cy="230" rx="11" ry="5" fill="#111"/>`
    : `<rect x="80" y="168" width="15" height="58" rx="6" fill="#24242e"/><rect x="105" y="168" width="15" height="58" rx="6" fill="#24242e"/><ellipse cx="85" cy="229" rx="12" ry="5" fill="#111"/><ellipse cx="115" cy="229" rx="12" ry="5" fill="#111"/>`;
  const rumpf = `<path d="M72 100 Q72 90 86 88 L114 88 Q128 90 128 100 L126 172 L74 172 Z" fill="#24242e"/><path d="M92 88 L100 100 L108 88" fill="#d4a017"/>`;
  const kopfG = `<g class="kopf" transform="translate(68 14)">${gesichtSvg(m, { rund: false })}</g>`;
  let hinter = "", vorn = "", arme = "";
  switch (l.haltung) {
    case "kinn": {
      const gr = l.id === "viola" ? 1.12 : 1;
      vorn = `<g transform="translate(128 100) rotate(-14) scale(${gr})"><ellipse cx="0" cy="0" rx="25" ry="12" fill="${c}"/><ellipse cx="-6" cy="0" rx="9" ry="7" fill="${c}" stroke="rgba(0,0,0,.25)"/><rect x="18" y="-2.5" width="34" height="5" rx="2" fill="#1b1b1b"/><circle cx="55" cy="0" r="4.5" fill="${c}"/><line x1="-20" y1="0" x2="50" y2="0" stroke="#ddd" stroke-width=".7"/></g>`;
      arme = arm([[125, 98], [158, 132], [178, 112]], haut) + `<g class="bogen-arm">${arm([[75, 98], [52, 128], [86, 106]], haut)}${bogen(60, 116, 170, 86)}</g>`; break;
    }
    case "zwischen":
      hinter = `<line x1="104" y1="140" x2="130" y2="44" stroke="#1b1b1b" stroke-width="6" stroke-linecap="round"/><circle cx="131" cy="40" r="6" fill="${c}"/>`;
      vorn = `<g transform="rotate(-12 100 178)"><path d="M100 136 C74 136 72 158 82 166 C70 176 70 210 100 214 C130 210 130 176 118 166 C128 158 126 136 100 136 Z" fill="${c}"/><line x1="100" y1="140" x2="100" y2="206" stroke="#ddd" stroke-width=".8"/><line x1="100" y1="214" x2="100" y2="232" stroke="#555" stroke-width="2"/></g>`;
      arme = arm([[125, 98], [146, 118], [122, 92]], haut) + `<g class="bogen-arm">${arm([[75, 98], [50, 140], [60, 172]], haut)}${bogen(46, 170, 150, 178)}</g>`; break;
    case "bass":
      hinter = `<line x1="132" y1="140" x2="150" y2="22" stroke="#1b1b1b" stroke-width="7" stroke-linecap="round"/><circle cx="151" cy="18" r="7" fill="${c}"/>`;
      vorn = `<g transform="rotate(-9 128 186)"><path d="M128 128 C96 128 94 156 106 166 C90 178 92 226 128 230 C164 226 166 178 150 166 C162 156 160 128 128 128 Z" fill="${c}"/><line x1="128" y1="132" x2="128" y2="224" stroke="#ddd" stroke-width=".8"/></g>`;
      arme = arm([[125, 98], [156, 112], [146, 80]], haut) + `<g class="bogen-arm">${arm([[75, 98], [70, 150], [104, 186]], haut)}${bogen(86, 196, 168, 184)}</g>`; break;
    case "quer":
      vorn = `<g class="instr"><rect x="14" y="66" width="98" height="6" rx="3" fill="#cfd3d6" transform="rotate(-6 98 72)"/>${[30, 42, 54, 66].map((x) => `<circle cx="${x}" cy="${71 - (98 - x) * 0.1}" r="2.2" fill="#9aa0a6"/>`).join("")}</g>`;
      arme = arm([[75, 98], [46, 112], [34, 66]], haut) + arm([[125, 98], [112, 116], [70, 70]], haut); break;
    case "gerade": {
      const kl = l.id === "klarinette";
      vorn = `<g class="instr"><path d="M97 74 L94 162 L106 162 L103 74 Z" fill="${c}"/><path d="M90 158 Q100 ${kl ? 178 : 172} 110 158 Z" fill="${c}"/>${[96, 108, 120, 134, 146].map((y) => `<circle cx="100" cy="${y}" r="2" fill="#c0c0c0"/>`).join("")}</g>`;
      arme = arm([[75, 98], [70, 124], [97, 132]], haut) + arm([[125, 98], [130, 104], [103, 104]], haut); break;
    }
    case "schraeg":
      hinter = `<g class="instr" transform="rotate(16 100 140)"><rect x="112" y="24" width="15" height="198" rx="7" fill="${c}"/><rect x="108" y="20" width="22" height="12" rx="4" fill="#d4c4a8"/></g>`;
      vorn = `<path d="M100 76 Q112 74 118 60" stroke="#c0c0c0" stroke-width="2.5" fill="none"/>`;
      arme = arm([[75, 98], [86, 140], [114, 150]], haut) + arm([[125, 98], [140, 112], [130, 92]], haut); break;
    case "vorn":
      vorn = `<g class="instr"><path d="M100 76 L148 80" stroke="${c}" stroke-width="6" stroke-linecap="round"/><path d="M110 86 L148 88 Q156 88 156 82" stroke="${c}" stroke-width="5" fill="none"/><path d="M146 70 L170 60 L170 100 L146 90 Z" fill="${c}"/><rect x="118" y="72" width="4" height="16" fill="#b8860b"/><rect x="126" y="72" width="4" height="16" fill="#b8860b"/><rect x="134" y="72" width="4" height="16" fill="#b8860b"/></g>`;
      arme = arm([[125, 98], [140, 112], [128, 84]], haut) + arm([[75, 98], [96, 118], [118, 90]], haut); break;
    case "zug":
      hinter = `<path d="M100 76 L70 60 L58 52" stroke="${c}" stroke-width="4" fill="none"/><path d="M60 44 L36 30 L36 74 L60 60 Z" fill="${c}"/>`;
      vorn = `<g class="zug"><rect x="100" y="74" width="80" height="4" rx="2" fill="${c}"/><rect x="100" y="84" width="80" height="4" rx="2" fill="${c}"/><rect x="176" y="72" width="6" height="18" rx="3" fill="${c}"/></g>`;
      arme = arm([[125, 98], [118, 112], [106, 80]], haut) + `<g class="zug">${arm([[75, 98], [110, 120], [150, 88]], haut)}</g>`; break;
    case "horn":
      vorn = `<g class="instr"><circle cx="66" cy="142" r="24" fill="none" stroke="${c}" stroke-width="7"/><circle cx="66" cy="142" r="13" fill="none" stroke="${c}" stroke-width="4"/><path d="M48 158 L26 178 L44 188 Z" fill="${c}"/><path d="M84 128 Q96 100 100 78" stroke="${c}" stroke-width="3" fill="none"/></g>`;
      arme = arm([[75, 98], [44, 140], [38, 176]], haut) + arm([[125, 98], [110, 130], [82, 134]], haut); break;
    case "tuba":
      vorn = `<g class="instr"><rect x="84" y="112" width="44" height="66" rx="20" fill="${c}"/><path d="M118 116 L132 52" stroke="${c}" stroke-width="16"/><ellipse cx="134" cy="46" rx="24" ry="9" fill="${c}"/><ellipse cx="134" cy="46" rx="18" ry="6" fill="#7a5c00"/><path d="M98 112 Q96 92 100 78" stroke="${c}" stroke-width="3" fill="none"/></g>`;
      arme = arm([[75, 98], [70, 130], [92, 128]], haut) + arm([[125, 98], [140, 118], [122, 112]], haut); break;
    case "pauke":
      vorn = `<g class="instr">${[60, 140].map((x) => `<path d="M${x - 34} 186 Q${x} 236 ${x + 34} 186 Z" fill="${c}"/><ellipse cx="${x}" cy="186" rx="34" ry="9" fill="#f3ead8" stroke="#8a6a3a"/>`).join("")}</g>`;
      arme = `<g class="schlaegel l">${arm([[75, 98], [56, 138], [62, 164]], haut)}<line x1="62" y1="164" x2="64" y2="182" stroke="#5b3a1a" stroke-width="3"/><circle cx="64" cy="183" r="5" fill="#f3ead8"/></g>`
        + `<g class="schlaegel r">${arm([[125, 98], [144, 138], [138, 164]], haut)}<line x1="138" y1="164" x2="136" y2="182" stroke="#5b3a1a" stroke-width="3"/><circle cx="136" cy="183" r="5" fill="#f3ead8"/></g>`; break;
    case "trommel":
      vorn = `<g class="instr"><rect x="70" y="176" width="60" height="26" rx="4" fill="#c62828"/><ellipse cx="100" cy="176" rx="30" ry="7" fill="#eee" stroke="#999"/><line x1="168" y1="140" x2="168" y2="226" stroke="#777" stroke-width="3"/><ellipse cx="168" cy="138" rx="24" ry="5" fill="#d4af37"/></g>`;
      arme = `<g class="schlaegel l">${arm([[75, 98], [64, 140], [84, 160]], haut)}<line x1="84" y1="160" x2="96" y2="172" stroke="#5b3a1a" stroke-width="3"/></g><g class="schlaegel r">${arm([[125, 98], [138, 140], [118, 160]], haut)}<line x1="118" y1="160" x2="106" y2="172" stroke="#5b3a1a" stroke-width="3"/></g>`; break;
    case "harfe":
      hinter = `<g class="instr"><path d="M150 24 Q190 60 176 120 L156 226" stroke="${c}" stroke-width="7" fill="none"/><line x1="150" y1="22" x2="150" y2="226" stroke="${c}" stroke-width="9"/>${[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => `<line x1="${153 + i * 2.6}" y1="${40 + i * 8}" x2="${153 + i * 0.6}" y2="${210 - i * 4}" stroke="${i % 7 === 0 ? "#c0392b" : "#eee"}" stroke-width=".9"/>`).join("")}<rect x="140" y="222" width="34" height="10" rx="3" fill="${c}"/></g>`;
      arme = `<g class="zupf">${arm([[125, 98], [146, 122], [160, 112]], haut)}${arm([[75, 98], [110, 150], [158, 150]], haut)}</g>`; break;
    case "klavier":
      vorn = `<g class="instr"><rect x="22" y="150" width="156" height="30" rx="3" fill="#1b1b1b"/><rect x="28" y="154" width="144" height="14" fill="#fff"/>${Array.from({ length: 17 }, (_, i) => `<line x1="${28 + i * 9}" y1="154" x2="${28 + i * 9}" y2="168" stroke="#bbb" stroke-width=".7"/>`).join("")}${[0, 1, 3, 4, 5, 7, 8, 10, 11, 12, 14, 15].map((i) => `<rect x="${34 + i * 9}" y="154" width="5" height="8" fill="#111"/>`).join("")}</g>`;
      arme = `<g class="hand l">${arm([[75, 98], [62, 138], [80, 156]], haut)}</g><g class="hand r">${arm([[125, 98], [138, 138], [120, 156]], haut)}</g>`; break;
  }
  return `<svg viewBox="0 0 200 240" class="figur-svg" role="img" aria-label="Figur spielt ${esc(l.name)}">${hinter}${beine}${rumpf}${kopfG}${vorn}${arme}</svg>`;
}

// ---------- Klang ----------
const ODE = [[4, 1], [4, 1], [5, 1], [7, 1], [7, 1], [5, 1], [4, 1], [2, 1], [0, 1], [0, 1], [2, 1], [4, 1], [4, 1.5], [2, 0.5], [2, 2]];
function folge(l, art) {
  if (l.klang === "trommel") return [[60, 1], [60, 0.5], [60, 0.5], [60, 1], ["becken", 1], [60, 0.5], [60, 0.5], [60, 0.5], [60, 0.5], ["becken", 2]];
  if (l.klang === "pauke") { const t = midi(l.umfang[0]) + 5; return [[t, 1], [t + 7, 1], [t, 0.5], [t, 0.5], [t + 7, 1], [t, 0.25], [t, 0.25], [t, 0.25], [t, 0.25], [t, 0.25], [t, 0.25], [t, 0.25], [t, 0.25], [t + 7, 2, 1.3]]; }
  if (art === "melodie") return ODE.map(([s, b]) => [l.lage + s, b]);
  if (art === "tonleiter") return [0, 2, 4, 5, 7, 9, 11, 12].map((s) => [l.lage + s, 0.6]).concat([[l.lage, 1.2]]);
  const tief = midi(l.umfang[0]), hoch = midi(l.umfang[1]), out = [];
  for (let t = tief; t < hoch; t += 12) out.push([t, 0.8]);
  out.push([hoch, 1.6]);
  return out; // umfang: vom tiefsten zum höchsten Ton in Oktaven
}
let AUDIO = null, laeuftBis = 0;
function abspielen(l, art) {
  try {
    AUDIO = AUDIO || new (window.AudioContext || window.webkitAudioContext)(); AUDIO.resume?.();
    const fig = document.getElementById("lehreFigur");
    const dauer = instrumentSpielen(AUDIO, l.klang, folge(l, art), { schlag: l.klang === "bass" || l.klang === "tuba" ? 0.48 : 0.4, onTon: () => notenFlug(fig) });
    fig?.classList.add("spielt"); laeuftBis = Date.now() + dauer * 1000;
    setTimeout(() => { if (Date.now() >= laeuftBis - 50) fig?.classList.remove("spielt"); }, dauer * 1000);
  } catch { toast("🔇 Dieses Gerät kann hier keinen Klang abspielen."); }
}
function notenFlug(fig) {
  if (!fig || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const n = document.createElement("span"); n.className = "lehre-note"; n.textContent = ["♪", "♫", "♩", "♬"][Math.floor(Math.random() * 4)];
  n.style.left = 45 + Math.random() * 40 + "%"; fig.appendChild(n); setTimeout(() => n.remove(), 1600);
}

// ---------- Ansicht ----------
const imBachkreis = (l) => {
  const typen = liste("instrument_typen", (t) => l.finde.test(t.name)).map((t) => t.id);
  const spieler = [...new Set(liste("person_instrument", (x) => typen.includes(x.typ_id)).map((x) => x.person_id))].filter((p) => hole("personen", p));
  const inv = liste("inventar", (i) => typen.includes(i.typ_id) && !INVENTAR_ABGANG.includes(i.status));
  return { typen, spieler, inv, frei: inv.filter((i) => i.status === "verfuegbar").length };
};
VIEWS.instrumentenkunde = {
  render({ id } = {}) {
    const l = LEHRE.find((x) => x.id === id);
    if (!l) {
      const gruppen = [...new Set(LEHRE.map((x) => x.familie))];
      return kopf("🎻 Instrumentenkunde") + `<p class="hinweis">Tippe ein Instrument an: Du siehst, wie man es hält, hörst, wie es klingt, und erfährst, worauf es ankommt.</p>`
        + gruppen.map((g) => `<h3 class="lehre-gruppe">${INSTRUMENT_GRUPPEN[g][0]} ${esc(INSTRUMENT_GRUPPEN[g][1])}</h3><div class="lehre-gitter">${LEHRE.filter((x) => x.familie === g).map((x) => {
          const b = imBachkreis(x);
          return `<button type="button" class="lehre-kachel" data-a="lehreOeffnen" data-x="${x.id}"><span class="lk-sym">${x.sym}</span><b>${esc(x.name)}</b><small>${b.spieler.length ? `${b.spieler.length} im Bachkreis` : "&nbsp;"}</small></button>`;
        }).join("")}</div>`).join("");
    }
    const m = merkmale(S.ich), b = imBachkreis(l), i = LEHRE.indexOf(l), vor = LEHRE[(i - 1 + LEHRE.length) % LEHRE.length], nach = LEHRE[(i + 1) % LEHRE.length];
    const gesichter = b.spieler.slice(0, 14).map((p) => `<button type="button" class="lehre-gesicht" data-a="oeffne" data-x="person|${esc(p)}" title="${esc(name(p))}">${gesicht(p, name(p))}</button>`).join("");
    return kopf(`${l.sym} ${esc(l.name)}`) + `<div class="lehre-kopf">
      <button type="button" class="knopf klein" data-a="lehreOeffnen" data-x="${vor.id}" aria-label="voriges Instrument">‹ ${esc(vor.name.split(" ")[0])}</button>
      <span class="badge">${INSTRUMENT_GRUPPEN[l.familie][0]} ${esc(INSTRUMENT_GRUPPEN[l.familie][1])}</span>
      <button type="button" class="knopf klein" data-a="lehreOeffnen" data-x="${nach.id}" aria-label="nächstes Instrument">${esc(nach.name.split(" ")[0])} ›</button></div>
      <div class="lehre-buehne"><div class="lehre-figur" id="lehreFigur">${figurSvg(l, m)}</div>
        <div class="lehre-hoeren"><b>🔊 So klingt es</b>
          <button type="button" class="knopf haupt" data-a="lehreSpielen" data-x="${l.id}|melodie">▶️ ${l.klang === "trommel" || l.klang === "pauke" ? "Rhythmus" : "Melodie"}</button>
          ${l.umfang[0] ? `<button type="button" class="knopf" data-a="lehreSpielen" data-x="${l.id}|tonleiter">🎵 Tonleiter</button><button type="button" class="knopf" data-a="lehreSpielen" data-x="${l.id}|umfang">↕️ tief bis hoch</button>` : ""}
          <small class="hinweis">Klang am Gerät erzeugt – ein echtes Instrument klingt viel schöner. 😉</small></div></div>
      <p class="lehre-kurz">${esc(l.kurz)}</p>
      <div class="lehre-steckbrief">
        <div><small>Tonumfang</small><b>${l.umfang[0] ? `${esc(l.umfang[0].replace("b", "♭"))} – ${esc(l.umfang[1].replace("b", "♭"))}` : "ohne feste Tonhöhe"}</b></div>
        <div><small>Notenschlüssel</small><b>${esc(l.schluessel)}</b></div><div><small>Stimmung</small><b>${esc(l.stimmung)}</b></div><div><small>Steckbrief</small><b>${esc(l.steckbrief)}</b></div></div>
      <details class="karte lehre-abschnitt" open><summary>✋ Darauf kommt es an</summary><ul>${l.beachten.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></details>
      <details class="karte lehre-abschnitt"><summary>🧽 Pflege</summary><ul>${l.pflege.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></details>
      <details class="karte lehre-abschnitt"><summary>🌱 Einstieg</summary><p>${esc(l.einstieg)}</p></details>
      <div class="karte lehre-wussten">💡 <b>Schon gewusst?</b> ${esc(l.wussten)}</div>
      <div class="karte"><h3>🎼 Im Bachkreis</h3>${b.spieler.length ? `<div class="lehre-gesichter">${gesichter}${b.spieler.length > 14 ? `<span class="hinweis">+${b.spieler.length - 14}</span>` : ""}</div><p class="hinweis">${b.spieler.length} ${b.spieler.length === 1 ? "spielt" : "spielen"} ${esc(l.name.split(" ")[0])}.</p>` : `<p class="hinweis">Zurzeit spielt das im Bachkreis niemand – vielleicht du? 😊</p>`}
        ${istVerwalter() && b.inv.length ? `<p>🏷️ Leihinstrumente: <b>${b.frei} frei</b> von ${b.inv.length} <button type="button" class="knopf klein" data-a="lehreInventar" data-x="${esc(b.typen[0] || "")}">Ansehen ›</button></p>` : ""}</div>`;
  },
};
AKTIONEN.lehreOeffnen = (id) => { if (AUDIO) { try { AUDIO.close(); } catch {} AUDIO = null; } zeige("instrumentenkunde", { id }, { ersetzen: S.view === "instrumentenkunde" && !!S.params.id }); };
AKTIONEN.lehreSpielen = (x) => { const [id, art] = String(x).split("|"), l = LEHRE.find((y) => y.id === id); if (l) abspielen(l, art); };
AKTIONEN.lehreInventar = (typ) => { try { sessionStorage.setItem("bk_inst_filter", JSON.stringify({ q: "", status: "aktiv", gruppe: "", typ, standort: "", zustand: "" })); } catch {} zeige("instrumente"); };
// Aus anderen Bereichen (Orchester, Instrumente): passendes Kapitel zu einem Instrumenten- oder Registernamen
export const lehreZu = (text) => LEHRE.find((l) => l.finde.test(String(text || "")))?.id || null;
