"""Werkzeug: Aufnahmen aus VSCO-2-CE (CC0) auswählen, laden, Tonhöhe messen, schneiden und als kleine MP3 ablegen.
Daten liegen in einem eigenen Ordner (dl/), dieses Skript liegt getrennt davon."""
import json, os, re, subprocess, sys, urllib.parse, urllib.request
import numpy as np

# Arbeitsordner außerhalb des Projekts (Teil-Klon von github.com/sgossner/VSCO-2-CE in $VSCO/repo, Downloads in $VSCO/dl)
BASIS = os.environ.get("VSCO", os.path.expanduser("~/vsco"))
REPO = BASIS + "/repo"
DL = BASIS + "/dl"
RAW = "https://raw.githubusercontent.com/sgossner/VSCO-2-CE/master/"
NAMEN = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}

def liste(ordner):
    out = subprocess.run(["git", "-C", REPO, "ls-tree", "-r", "--name-only", "HEAD", "--", ordner], capture_output=True, text=True).stdout
    return [l for l in out.splitlines() if l.lower().endswith(".wav")]

def note(name):  # "A#3" -> midi nach wissenschaftlicher Zählung (A4 = 69)
    m = re.match(r"([A-G])(#?)(-?\d)$", name)
    return 12 * (int(m.group(3)) + 1) + NAMEN[m.group(1)] + (1 if m.group(2) else 0)

def laden(pfad):
    os.makedirs(DL, exist_ok=True)
    ziel = DL + "/" + re.sub(r"[^A-Za-z0-9_.#-]", "_", pfad)
    if not os.path.exists(ziel):
        url = RAW + urllib.parse.quote(pfad)
        with urllib.request.urlopen(url, timeout=60) as r, open(ziel, "wb") as f:
            f.write(r.read())
    return ziel

def pcm(datei, sr=22050):
    roh = subprocess.run(["ffmpeg", "-v", "quiet", "-i", datei, "-ac", "1", "-ar", str(sr), "-f", "f32le", "-"], capture_output=True).stdout
    return np.frombuffer(roh, dtype=np.float32), sr

def tonhoehe(datei):
    x, sr = pcm(datei)
    if len(x) < sr * 0.4: return None
    a = int(len(x) * 0.25); s = x[a:a + int(sr * 0.5)]
    s = s - s.mean()
    if np.max(np.abs(s)) < 1e-4: return None
    # YIN-Differenzfunktion
    tau_max = int(sr / 25); n = len(s) - tau_max
    d = np.array([np.sum((s[:n] - s[t:t + n]) ** 2) for t in range(1, tau_max)])
    cm = d * np.arange(1, tau_max) / np.maximum(np.cumsum(d), 1e-12)
    kand = np.where(cm < 0.15)[0]
    t = (kand[0] if len(kand) else np.argmin(cm)) + 1
    while t < tau_max - 2 and d[t] < d[t - 1]: t += 1
    f = sr / t
    return 69 + 12 * np.log2(f / 440)

if __name__ == "__main__":
    for pfad in sys.argv[1:]:
        p = laden(pfad); m = tonhoehe(p)
        print(f"{pfad.split('/')[-1]}: gemessen {m:.2f}" if m else f"{pfad}: ?")
