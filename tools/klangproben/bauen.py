"""Baut ton/instrumente/<art>/<midi>.mp3 aus VSCO-2-CE (CC0) und schreibt js/kern/klangproben.js.
Je Instrument Aufnahmen im Abstand von etwa 3–5 Halbtönen; Tonhöhe = Name + Oktav-Versatz, per Messung geprüft."""
import json, os, re, subprocess, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from vsco import liste, laden, tonhoehe, note, REPO

APP = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ZIEL = APP + "/ton/instrumente"
# art: (Ordner, Regex für Datei → Notenname, bevorzugte Dynamik-Muster, Versatz, Tonumfang midi, Länge s, Art der Hüllkurve)
QUELLEN = {
    "violine": ("Strings/Solo Violin/Arco Vib", r"_([A-G]#?\d)_f\.wav$", 0, (55, 100), 2.6),
    "viola": ("Strings/Viola Section/susvib", r"_([A-G]#?\d)_v2_1\.wav$", 12, (48, 88), 2.6),
    "cello": ("Strings/Cello Section/susvib", r"susvib_([A-G]#?\d)_v3_1\.wav$", 12, (36, 76), 2.6),
    "bass": ("Strings/Solo Contrabass/SusVib", r"_([A-G]#?\d)_v3_rr1\.wav$", 12, (28, 67), 2.6),
    "floete": ("Woodwinds/Flute/susvib", r"_([A-G]#?\d)_v1_1\.wav$", 12, (60, 96), 2.6),
    "oboe": ("Woodwinds/Oboe/Vib", r"_([A-G]#?\d)_v3_Main\.wav$", 12, (58, 92), 2.6),
    "klarinette": ("Woodwinds/Clarinet/susLong", r"_([A-G]#?\d)_v2_rr1_sum\.wav$", 12, (50, 91), 2.6),
    "fagott": ("Woodwinds/Bassoon/vib", r"_([A-G]#?\d)_v2_1\.wav$", 12, (34, 75), 2.6),
    "trompete": ("Brass/Trumpet/susvib", r"_([A-G]#?\d)_v2_rr1\.wav$", 12, (54, 84), 2.6),
    "horn": ("Brass/F Horn/sus", r"_([A-G]#?\d)_v2_1\.wav$", 12, (34, 77), 2.6),
    "posaune": ("Brass/Tenor Trombone/sus", r"_([A-G]#?\d)_v2_1\.wav$", 12, (40, 72), 2.6),
    "tuba": ("Brass/Tuba/sus", r"_([A-G]#?\d)_v2_rr1_Mid\.wav$", 12, (28, 65), 2.6),
    "harfe": ("Strings/Harp", r"KSHarp_([A-G]#?\d)_mf\.wav$", 0, (24, 103), 3.0),
    "glockenspiel": ("Percussion/Glock", r"glock_medium_([A-G]#?\d)\.wav$", 12, (79, 108), 2.5),
}
ABSTAND = 4  # höchstens alle 4 Halbtöne eine Aufnahme (sonst wird es zu groß)

def mp3(quelle, ziel, laenge, start_fade=0.0):
    os.makedirs(os.path.dirname(ziel), exist_ok=True)
    fade = 0.35
    filt = f"silenceremove=start_periods=1:start_threshold=-60dB,atrim=0:{laenge},afade=t=out:st={laenge - fade}:d={fade},loudnorm=I=-18:TP=-2:LRA=11"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", quelle, "-af", filt, "-ac", "1", "-ar", "44100", "-codec:a", "libmp3lame", "-q:a", "6", ziel], check=True)

def auswahl(kand, umfang):
    kand = sorted(k for k in kand if umfang[0] - 3 <= k[0] <= umfang[1] + 3)
    gew = []
    for m, p in kand:
        if not gew or m - gew[-1][0] >= ABSTAND - 1: gew.append((m, p))
    return gew

def main():
    manifest = {}
    for art, (ordner, rx, vers, umfang, laenge) in QUELLEN.items():
        kand = []
        for p in liste(ordner):
            m = re.search(rx, p)
            if m: kand.append((note(m.group(1)) + vers, p))
        gew = auswahl(kand, umfang)
        ok = []
        for m, p in gew:
            d = laden(p); gemessen = tonhoehe(d)
            if gemessen is not None and abs(((gemessen - m + 6) % 12) - 6) > 0.7:
                print(f"  ⚠ {art} {p.split('/')[-1]}: Name {m}, gemessen {gemessen:.2f} – übersprungen"); continue
            mp3(d, f"{ZIEL}/{art}/{m}.mp3", laenge); ok.append(m)
        manifest[art] = ok
        print(f"{art}: {ok}")
    # 🥁 Pauke: Schläge 1–5 messen; Trommel/Becken: je ein Schlag
    pauke = []
    for p in liste("Percussion/Timpani"):
        if re.search(r"Timpani\d_Hit_v3_rr1_Sum\.wav$", p):
            d = laden(p); g = tonhoehe(d)
            if g is None: continue
            m = int(round(g))
            while m > 60: m -= 12
            while m < 38: m += 12
            if m not in pauke: mp3(d, f"{ZIEL}/pauke/{m}.mp3", 2.6); pauke.append(m)
    manifest["pauke"] = sorted(pauke); print("pauke:", manifest["pauke"])
    snare = [p for p in liste("VSCO 1 Percussion/drums/snare") if re.search(r"hit", p, re.I)] or liste("VSCO 1 Percussion/drums/snare")
    becken = [p for p in liste("VSCO 1 Percussion/varMetal/Cymbals") if re.search(r"crash|hit", p, re.I)] or liste("VSCO 1 Percussion/varMetal/Cymbals")
    print("snare-wahl:", snare[:3]); print("becken-wahl:", becken[:3])
    mp3(laden(snare[len(snare) // 2]), f"{ZIEL}/trommel/schlag.mp3", 0.8)
    mp3(laden(becken[len(becken) // 2]), f"{ZIEL}/trommel/becken.mp3", 2.0)
    # 🎹 Klavier: Key-Nummern laut MappingChart (000 = 21, je +2)
    karte = subprocess.run(["git", "-C", REPO, "show", "HEAD:Keys/Upright Piano/MappingChart.txt"], capture_output=True, text=True).stdout
    keys = {k: int(v) for k, v in re.findall(r"^(\d{3})=(\d+)", karte, re.M)}
    kl = []
    for p in liste("Keys/Upright Piano"):
        m = re.search(r"Player_dyn2_rr1_(\d{3})\.wav$", p)
        if m and m.group(1) in keys and 33 <= keys[m.group(1)] <= 100: kl.append((keys[m.group(1)], p))
    gew = auswahl(kl, (36, 96)); ok = []
    for m, p in gew:
        d = laden(p); g = tonhoehe(d)
        if g is not None and abs(((g - m + 6) % 12) - 6) > 0.7: print(f"  ⚠ klavier {m}: gemessen {g:.2f}"); continue
        mp3(d, f"{ZIEL}/klavier/{m}.mp3", 2.8); ok.append(m)
    manifest["klavier"] = ok; print("klavier:", ok)
    with open(APP + "/js/kern/klangproben.js", "w") as f:
        f.write("// 🎻 Echte Instrumentenklänge (0.34.0): kurze Aufnahmen aus VS Chamber Orchestra 2 – Community Edition (Versilian Studios, CC0),\n")
        f.write("// erzeugt mit tools/klangproben/bauen.py (siehe docs/LIZENZEN-TOENE.md). Je Instrument die MIDI-Nummern der vorhandenen Aufnahmen (ton/instrumente/<art>/<midi>.mp3);\n")
        f.write("// Töne dazwischen werden umgestimmt. Nicht von Hand ändern.\n")
        f.write("export const KLANGPROBEN = " + json.dumps(manifest, ensure_ascii=False) + ";\n")
    print(json.dumps(manifest))

if __name__ == "__main__":
    main()
