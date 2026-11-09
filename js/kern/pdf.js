// 📄 PDF selbst bauen (0.53.0, wie KC „📄 PDF in jeder Druckvorschau“): ein echtes A4-PDF aus JPEG-Seitenbildern – ohne fremde Bibliothek,
// ohne fremden Dienst. Jede Seite ist ein Bild (DCTDecode), das die ganze Seite füllt. Reines JavaScript, läuft auch in Tests (Node).
const enc = new TextEncoder();
export const A4 = { hoch: [595.28, 841.89], quer: [841.89, 595.28] };

export function pdfAusJpegs(seiten, { format = "hoch", titel = "Bachkreis" } = {}) {
  const [W, H] = A4[format] || A4.hoch, teile = [], offsets = [];
  let laenge = 0;
  const schreib = (x) => { const b = typeof x === "string" ? enc.encode(x) : x; teile.push(b); laenge += b.length; };
  const obj = (nr, kopf, strom = null) => {
    offsets[nr] = laenge;
    schreib(`${nr} 0 obj\n${kopf}\n`);
    if (strom) { schreib("stream\n"); schreib(strom); schreib("\nendstream\n"); }
    schreib("endobj\n");
  };
  schreib("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n".replace(/[\u0080-ÿ]/g, "a")); // Binär-Kennung (als ASCII-Ersatz – reicht für Leser)
  const n = seiten.length, seitenNr = (i) => 3 + i * 3; // je Seite: Page, Inhalt, Bild
  obj(1, "<< /Type /Catalog /Pages 2 0 R >>");
  obj(2, `<< /Type /Pages /Count ${n} /Kids [${seiten.map((_, i) => `${seitenNr(i)} 0 R`).join(" ")}] >>`);
  seiten.forEach((s, i) => {
    const p = seitenNr(i), inhalt = enc.encode(`q ${W.toFixed(2)} 0 0 ${H.toFixed(2)} 0 0 cm /Bild${i} Do Q`);
    obj(p, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W.toFixed(2)} ${H.toFixed(2)}] /Resources << /XObject << /Bild${i} ${p + 2} 0 R >> >> /Contents ${p + 1} 0 R >>`);
    obj(p + 1, `<< /Length ${inhalt.length} >>`, inhalt);
    obj(p + 2, `<< /Type /XObject /Subtype /Image /Width ${s.w} /Height ${s.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${s.daten.length} >>`, s.daten);
  });
  const info = 3 + n * 3;
  obj(info, `<< /Title (${String(titel).replace(/[()\\]/g, "").replace(/[^\x20-\x7e]/g, "?")}) /Producer (Bachkreis-App) >>`);
  const xref = laenge, zahl = info + 1;
  schreib(`xref\n0 ${zahl}\n0000000000 65535 f \n${offsets.slice(1).map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`);
  schreib(`trailer\n<< /Size ${zahl} /Root 1 0 R /Info ${info} 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  const out = new Uint8Array(laenge); let pos = 0;
  for (const t of teile) { out.set(t, pos); pos += t.length; }
  return out;
}
// Seitenumbrüche: an Blockgrenzen (nie mitten durch eine Zeile); zu hohe Blöcke werden notfalls geteilt
export function umbrueche(gesamt, seite, grenzen) {
  const l = [...new Set(grenzen.filter((g) => g > 0 && g < gesamt))].sort((a, b) => a - b), aus = [0];
  let start = 0;
  while (gesamt - start > seite) {
    const kand = l.filter((g) => g > start + seite * 0.5 && g <= start + seite);
    const ende = kand.length ? kand[kand.length - 1] : start + seite;
    aus.push(ende); start = ende;
  }
  return aus;
}
