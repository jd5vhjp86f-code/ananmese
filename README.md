# Digitaler Anamnesebogen (MRT)

Eine reine Client-Anwendung (HTML/CSS/JavaScript, kein Server, keine Datenbank), mit der Patient:innen den Aufklärungs- und Anamnesebogen für eine MRT-Untersuchung direkt im Browser ausfüllen, eigenhändig unterschreiben und als PDF herunterladen können.

Alle Eingaben (inklusive Unterschrift) verbleiben ausschließlich im Browser des Geräts. Es werden keine Daten an einen Server übertragen – die PDF-Erstellung erfolgt vollständig lokal.

## Verwendung

Die Anwendung besteht nur aus statischen Dateien und benötigt keinen Build-Schritt.

**Lokal öffnen:** `index.html` direkt im Browser öffnen, oder – empfohlen, damit alle Assets zuverlässig laden – über einen einfachen lokalen Webserver bereitstellen:

```bash
python3 -m http.server 8080
# dann im Browser: http://localhost:8080/
```

**Auf einem Tablet in der Praxis:** Die Dateien auf einen beliebigen Webspace / internen Server legen und im Kiosk-/Vollbildmodus des Tablet-Browsers öffnen. Funktioniert offline, sobald die Seite einmal geladen wurde (keine externen CDN-Abhängigkeiten – jsPDF liegt unter `lib/`, die Schriften unter `assets/fonts/`).

## Ablauf für Patient:innen

1. **Aufklärung** – vollständiger Info-Text zur MRT-Untersuchung, muss bestätigt werden.
2. **Persönliche Daten** – Name, Geburtsdatum, Telefon, E-Mail.
3. **Sicherheitsfragen** – MRT-Tauglichkeit (Herzschrittmacher, Metallteile, Allergien, Nierenerkrankung, Schwangerschaft usw.), Gewicht/Größe, Vermerke.
4. **Anamnese** – Schmerzlokalisation, Körperschema zum Markieren der Schmerzbereiche (Finger/Maus/Stift), Schmerzcharakter.
5. **Einwilligung** – Zustimmung zur Untersuchung, Ort/Datum (Behandlungsdatum wird automatisch mit dem aktuellen Datum vorbelegt, ist aber änderbar), eigenhändige Unterschrift per Zeichenfläche. Bei minderjährigen Patient:innen zusätzlicher Block mit Unterschrift der/des Sorgeberechtigten.
6. **Abschluss** – Zusammenfassung und Erzeugung/Download des ausgefüllten PDF-Dokuments.

## Praxisdaten anpassen

Kopfzeile des PDFs (Praxisname, Ärzte, Adresse, Telefon) in `app.js` ganz oben im Objekt `PRAXIS` anpassen:

```js
const PRAXIS = {
  name: "Radiologie Dammtor",
  standorte: "Radiologie Dammtor und Radiologie Walddörfer",
  adresse: "Stephansplatz 1 · Dammtorwall 7a, 20354 Hamburg",
  telefon: "Tel: 040 - 35 00 4840"
};
```

## Praxis-Design anpassen

Der Bogen folgt dem Erscheinungsbild von Radiologie Dammtor. Alle Gestaltungsentscheidungen liegen an genau zwei Stellen.

### Bildschirm: `:root` in `style.css`

```css
:root {
  --brand-taupe:     #7c6e65;  /* Wortmarke, Überschriften */
  --brand-blue:      #68b1d4;  /* Modalitätsfarbe MRT */
  --brand-blue-deep: #005f83;  /* dunkles Ende des Logo-Verlaufs */
  --brand-sand:      #eceae5;  /* warmer Flächenton */
  /* ... Rollen: --accent, --ink, --border, --radius, --font-sans ... */
}
```

Die Palette stammt aus dem Theme der Praxis-Website. Außerhalb von `:root` enthält das Stylesheet keine Farbliterale.

**Warum Bedienelemente nicht im Marken-Hellblau sind:** `#68b1d4` erreicht auf Weiß nur 2,4 : 1 Kontrast und verfehlt die WCAG-Schwelle von 4,5 : 1 für Text deutlich. Für einen Bogen, den ältere Patient:innen auf einem Tablet mit Sichtschutzfolie ausfüllen, ist das nicht vertretbar. Buttons, aktive Zustände und Fokusrahmen nutzen deshalb `#005f83` — das dunkle Ende des Verlaufs in der Bildmarke, 7,1 : 1 — und das Hellblau bleibt Flächen ohne Textfunktion vorbehalten (Fortschrittsbalken, Marker).

### PDF: `PDF_THEME` in `app.js`

Farben als RGB-Tripel, dazu die Logobreite im Briefkopf und die Sperrung der Abschnittstitel. Der Briefkopf bettet `assets/logo.png` ein und fällt auf eine Textzeile zurück, falls die Grafik nicht geladen ist.

## Schriften

Die Hausschrift der Praxis-Website ist **URW DIN**, ausgeliefert über Adobe Fonts (Kit `oty8vws`). Sie lässt sich für diesen Bogen **nicht verwenden**:

- Adobe-Fonts-Lizenzen sind an Domains gebunden und erlauben kein lokales Hosten der Schriftdateien. Der Bogen muss aber auf den Praxis-Tablets offline laufen — im geplanten Betrieb hat der Server bewusst keinen Internetzugang.
- Für das Einbetten in die PDF-Datei (`doc.addFont`) wird ebenfalls eine Schriftdatei gebraucht, was die Web-Lizenz nicht abdeckt.

Der Bogen nutzt daher **Barlow** (SIL Open Font License 1.1) als Stellvertreter, lokal unter `assets/fonts/` eingebunden. Barlow teilt die DIN-nahe Anmutung — geschlossene, schmale Grotesk mit niedrigem Strichkontrast —, ist aber nicht identisch. Wer die Marke schriftgenau abbilden will, lizenziert URW DIN für Web-Self-Hosting und PDF-Einbettung direkt bei URW/Monotype und tauscht dann `--font-sans` sowie `PDF_THEME.font` aus.

Im PDF läuft der Fließtext bewusst in der jsPDF-Standardschrift Helvetica. Eine eingebettete Schrift würde jede erzeugte Datei um rund 220 KB vergrößern — bei mehreren tausend Bögen im Jahr, die dauerhaft in MEDICAL OFFICE liegen, ein spürbarer Posten ohne entsprechenden Gewinn. Die Markenwirkung trägt im PDF das Logo im Briefkopf (rund 19 KB) zusammen mit der Farbpalette.

### Logo

| Datei | Verwendung |
| --- | --- |
| `assets/logo.svg` | Seitenkopf am Bildschirm, vektoriell |
| `assets/logo.png` | Briefkopf im PDF, 600 × 174 px (jsPDF kann kein SVG einbetten) |
| `assets/logo-icon.svg` | Bildmarke ohne Schriftzug, als Reserve |

Beim Austausch des Logos muss `logo.png` dasselbe Seitenverhältnis behalten oder `PDF_THEME.logoWidth` angepasst werden — die Höhe im Briefkopf wird aus dem Seitenverhältnis der Grafik berechnet.

## Technischer Aufbau

- `index.html` – Struktur des mehrstufigen Formulars
- `style.css` – Design (responsive, für Tablet/Smartphone optimiert)
- `app.js` – Formularlogik, Zeichenflächen (Körperschema & Unterschrift), PDF-Erzeugung
- `assets/bodymap.png` – Körperschema-Grafik (vorne/hinten/Halswirbelsäule) als Vorlage zum Markieren
- `assets/logo.svg`, `assets/logo.png`, `assets/logo-icon.svg` – Logo für Bildschirm und PDF
- `assets/fonts/` – Barlow (SIL OFL 1.1) als woff2, lokal eingebunden
- `lib/jspdf.umd.min.js` – lokal eingebundene [jsPDF](https://github.com/parallax/jsPDF)-Bibliothek zur PDF-Erzeugung im Browser

Kein Build-Tool, kein Framework, keine externen Netzwerkaufrufe zur Laufzeit.
