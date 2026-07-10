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

Der Fragenkatalog (Sicherheitsfragen, Schmerzbeschreibungen) ist direkt in `index.html` (Fragen) bzw. `app.js` (Liste `SCHMERZ_OPTIONEN`) hinterlegt und kann dort bei Bedarf angepasst werden.

## Technischer Aufbau

- `index.html` – Struktur des mehrstufigen Formulars
- `style.css` – Design (responsive, für Tablet/Smartphone optimiert)
- `app.js` – Formularlogik, Zeichenflächen (Körperschema & Unterschrift), PDF-Erzeugung
- `assets/bodymap.png` – Körperschema-Grafik (vorne/hinten/Halswirbelsäule) als Vorlage zum Markieren
- `lib/jspdf.umd.min.js` – lokal eingebundene [jsPDF](https://github.com/parallax/jsPDF)-Bibliothek zur PDF-Erzeugung im Browser

Kein Build-Tool, kein Framework, keine externen Netzwerkaufrufe zur Laufzeit.
