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

**Auf einem Tablet in der Praxis:** Die Dateien auf einen beliebigen Webspace / internen Server legen und im Kiosk-/Vollbildmodus des Tablet-Browsers öffnen. Funktioniert offline, sobald die Seite einmal geladen wurde (keine externen CDN-Abhängigkeiten – jsPDF liegt lokal unter `lib/`).

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
  name: "mrt diagnostik dammtorwall",
  aerzte: "Dr. D. Rückner und Dr. R. Rückner",
  adresse: "Stephansplatz 1 · Dammtorwall 7a, 20354 Hamburg",
  telefon: "Tel: 040 - 35 00 4840"
};
```

## Praxis-Design anpassen

Alle Gestaltungsentscheidungen liegen an genau zwei Stellen:

**Bildschirm:** der `:root`-Block am Anfang von `style.css`. Farben, Schriftstack, Eckenradien und Kartenschatten sind dort als CSS-Variablen definiert; der restliche Stylesheet enthaelt keine harten Farbwerte mehr.

```css
:root {
  --blue: #1d6fa5;        /* Markenfarbe: Buttons, Links, aktive Elemente */
  --blue-dark: #145581;   /* Kopfzeile, Ueberschriften */
  --blue-light: #eaf3fa;  /* zarte Fuellflaechen */
  --ink: #1f2933;         /* Textfarbe */
  --font-sans: "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  --radius: 12px;
  /* ... */
}
```

Eine Hausschrift als Webfont wird per `@font-face` oder `@import` oberhalb von `:root` geladen und dann in `--font-sans` bzw. `--font-display` eingetragen. Fuer den Offline-Betrieb auf Praxis-Tablets die Schriftdateien lokal unter `assets/` ablegen, nicht von einem CDN laden.

**PDF:** das Objekt `PDF_THEME` in `app.js`, direkt unter `PRAXIS`. Farben als RGB-Tripel, Schrift als jsPDF-Schriftname.

```js
const PDF_THEME = {
  font: "helvetica",
  heading: [20, 85, 129],
  /* ... */
};
```

jsPDF kennt von sich aus nur `helvetica`, `times` und `courier`. Eine eigene Hausschrift im PDF erfordert zusaetzlich das Einbetten der Schriftdatei ueber `doc.addFont` - das vergroessert jede PDF-Datei um die Schrift und ist nur sinnvoll, wenn das Corporate Design es verlangt.

Der Fragenkatalog (Sicherheitsfragen, Schmerzbeschreibungen) ist direkt in `index.html` (Fragen) bzw. `app.js` (Liste `SCHMERZ_OPTIONEN`) hinterlegt und kann dort bei Bedarf angepasst werden.

## Technischer Aufbau

- `index.html` – Struktur des mehrstufigen Formulars
- `style.css` – Design (responsive, für Tablet/Smartphone optimiert)
- `app.js` – Formularlogik, Zeichenflächen (Körperschema & Unterschrift), PDF-Erzeugung
- `assets/bodymap.png` – Körperschema-Grafik (vorne/hinten/Halswirbelsäule) als Vorlage zum Markieren
- `lib/jspdf.umd.min.js` – lokal eingebundene [jsPDF](https://github.com/parallax/jsPDF)-Bibliothek zur PDF-Erzeugung im Browser

Kein Build-Tool, kein Framework, keine externen Netzwerkaufrufe zur Laufzeit.
