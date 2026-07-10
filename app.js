(function () {
  "use strict";

  /* ---------- Praxis-Konfiguration (hier bei Bedarf anpassen) ---------- */
  const PRAXIS = {
    name: "mrt diagnostik dammtorwall",
    aerzte: "Dr. D. Rückner und Dr. R. Rückner",
    adresse: "Stephansplatz 1 · Dammtorwall 7a, 20354 Hamburg",
    telefon: "Tel: 040 - 35 00 4840"
  };

  const SCHMERZ_OPTIONEN = [
    "örtlich begrenzt", "dumpf", "brennend, heiß", "bohrend", "reißend",
    "in Ruhe stärker", "mit Lähmung",
    "ausstrahlend", "drückend", "elektrisierend", "krampfartig", "dauernd",
    "bei Bewegung stärker", "mit Störung und/oder Zunahme beim Wasserlassen bzw. Stuhlgang",
    "pochend", "einschießend", "kolikartig", "wechselnd", "haltungsabhängig",
    "klopfend", "stechend", "ziehend", "allmählich", "mit Taubheit"
  ];

  const TOTAL_STEPS = 6;
  let currentStep = 1;

  /* ---------- Schritt-Navigation ---------- */

  const stepEls = Array.from(document.querySelectorAll(".step"));
  const stepperItems = Array.from(document.querySelectorAll(".stepper li"));
  const progressFill = document.getElementById("progressFill");
  const stepIndicator = document.getElementById("stepIndicator");
  const backBtn = document.getElementById("backBtn");
  const nextBtn = document.getElementById("nextBtn");

  function showStep(n) {
    currentStep = n;
    stepEls.forEach(el => el.classList.toggle("active", Number(el.dataset.step) === n));
    stepperItems.forEach(li => {
      const s = Number(li.dataset.step);
      li.classList.toggle("active", s === n);
      li.classList.toggle("done", s < n);
    });
    progressFill.style.width = (n / TOTAL_STEPS * 100) + "%";
    stepIndicator.textContent = `Schritt ${n} von ${TOTAL_STEPS}`;
    backBtn.disabled = n === 1;
    nextBtn.textContent = n === TOTAL_STEPS ? "Fertig" : "Weiter";
    nextBtn.style.visibility = n === TOTAL_STEPS ? "hidden" : "visible";
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (n === 6) renderSummary();
    resizeAllCanvases();
  }

  function validateStep(n) {
    if (n === 1) {
      if (!document.getElementById("ackInfo").checked) {
        alert("Bitte bestätigen Sie, dass Sie die Aufklärung gelesen und verstanden haben.");
        return false;
      }
    }
    if (n === 2) {
      const name = document.getElementById("pName").value.trim();
      const geb = document.getElementById("pGeb").value;
      const tel = document.getElementById("pTel").value.trim();
      if (!name || !geb || !tel) {
        alert("Bitte füllen Sie alle Pflichtfelder (*) aus.");
        return false;
      }
    }
    if (n === 5) {
      const consent = document.querySelector('input[name="einwilligung"]:checked');
      if (!consent) {
        alert("Bitte beantworten Sie die Einwilligungsfrage.");
        return false;
      }
      if (patientSig.isEmpty()) {
        alert("Bitte unterschreiben Sie im Unterschriftsfeld.");
        return false;
      }
      if (document.getElementById("minderjaehrig").checked && sorgeSig.isEmpty()) {
        alert("Bitte lassen Sie den/die Sorgeberechtigte(n) unterschreiben.");
        return false;
      }
    }
    return true;
  }

  backBtn.addEventListener("click", () => { if (currentStep > 1) showStep(currentStep - 1); });
  nextBtn.addEventListener("click", () => {
    if (!validateStep(currentStep)) return;
    if (currentStep < TOTAL_STEPS) showStep(currentStep + 1);
  });

  /* ---------- Konditionale Felder ---------- */

  function bindYesNoDetail(radioName, wrapId) {
    const wrap = document.getElementById(wrapId);
    document.querySelectorAll(`input[name="${radioName}"]`).forEach(r => {
      r.addEventListener("change", () => {
        wrap.classList.toggle("show", r.value === "ja" && r.checked);
      });
    });
  }
  bindYesNoDetail("metallteile", "metallteile_detail_wrap");
  bindYesNoDetail("allergien", "allergien_detail_wrap");

  const keineBeschwerden = document.getElementById("keineBeschwerden");
  const beschwerdenBlock = document.getElementById("beschwerdenBlock");
  keineBeschwerden.addEventListener("change", () => {
    const off = keineBeschwerden.checked;
    beschwerdenBlock.style.opacity = off ? "0.4" : "1";
    beschwerdenBlock.querySelectorAll("input, textarea").forEach(el => {
      if (off) { if (el.type === "checkbox") el.checked = false; else el.value = ""; }
      el.disabled = off;
    });
  });

  const minderjaehrig = document.getElementById("minderjaehrig");
  const minderjaehrigBlock = document.getElementById("minderjaehrigBlock");
  minderjaehrig.addEventListener("change", () => {
    minderjaehrigBlock.classList.toggle("hidden", !minderjaehrig.checked);
    resizeAllCanvases();
  });

  /* ---------- Schmerz-Checkboxen (2.0) generieren ---------- */

  const schmerzGrid = document.getElementById("schmerzGrid");
  SCHMERZ_OPTIONEN.forEach((opt, i) => {
    const label = document.createElement("label");
    label.className = "check-row";
    label.innerHTML = `<input type="checkbox" value="${opt}" id="schmerz_${i}"><span>${opt}</span>`;
    schmerzGrid.appendChild(label);
  });

  /* ---------- Datum automatisch (Behandlungstag) ---------- */

  const datumInput = document.getElementById("datum");
  const today = new Date();
  datumInput.value = today.toISOString().slice(0, 10);

  function formatDateDE(isoStr) {
    if (!isoStr) return "";
    const [y, m, d] = isoStr.split("-");
    return `${d}.${m}.${y}`;
  }

  /* ---------- Freihand-Zeichnen (Körperschema & Unterschriften) ---------- */

  class DrawablePad {
    constructor(canvas, opts) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.opts = Object.assign({ color: "#c0392b", alpha: 0.45, lineWidth: 14, eraseWidth: 34 }, opts || {});
      this.mode = "draw";
      this.drawing = false;
      this.hasContent = false;
      this.last = null;
      this._bind();
    }

    _bind() {
      const c = this.canvas;
      c.addEventListener("pointerdown", e => this._start(e));
      c.addEventListener("pointermove", e => this._move(e));
      window.addEventListener("pointerup", () => this._end());
      c.addEventListener("pointercancel", () => this._end());
    }

    _pos(e) {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
    }

    _start(e) {
      e.preventDefault();
      this.canvas.setPointerCapture && this.canvas.setPointerCapture(e.pointerId);
      this.drawing = true;
      this.last = this._pos(e);
      this._dot(this.last);
    }

    _move(e) {
      if (!this.drawing) return;
      e.preventDefault();
      const p = this._pos(e);
      this._line(this.last, p);
      this.last = p;
    }

    _end() { this.drawing = false; this.last = null; }

    _dot(p) { this._line(p, { x: p.x + 0.01, y: p.y + 0.01 }); }

    _line(a, b) {
      const ctx = this.ctx;
      ctx.save();
      if (this.mode === "erase") {
        ctx.globalCompositeOperation = "destination-out";
        ctx.lineWidth = this.opts.eraseWidth;
        ctx.strokeStyle = "rgba(0,0,0,1)";
      } else {
        ctx.globalCompositeOperation = "source-over";
        ctx.lineWidth = this.opts.lineWidth;
        ctx.strokeStyle = this.opts.color;
        ctx.globalAlpha = this.opts.alpha;
        this.hasContent = true;
      }
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.restore();
    }

    setMode(m) { this.mode = m; }

    clear() {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.hasContent = false;
    }

    resize() {
      const rect = this.canvas.getBoundingClientRect();
      if (rect.width === 0) return;
      const dpr = window.devicePixelRatio || 1;
      const prev = document.createElement("canvas");
      prev.width = this.canvas.width; prev.height = this.canvas.height;
      if (this.canvas.width && this.canvas.height) {
        prev.getContext("2d").drawImage(this.canvas, 0, 0);
      }
      this.canvas.width = rect.width * dpr;
      this.canvas.height = rect.height * dpr;
      if (prev.width && prev.height) {
        this.ctx.drawImage(prev, 0, 0, prev.width, prev.height, 0, 0, this.canvas.width, this.canvas.height);
      }
    }

    isEmpty() { return !this.hasContent; }

    dataURL() { return this.canvas.toDataURL("image/png"); }
  }

  // Körperschema-Canvas
  const bodymapCanvas = document.getElementById("bodymapCanvas");
  const bodymapPad = new DrawablePad(bodymapCanvas, { color: "#d64545", alpha: 0.5, lineWidth: 16, eraseWidth: 40 });
  document.getElementById("toolDraw").addEventListener("click", () => setBodymapTool("draw"));
  document.getElementById("toolErase").addEventListener("click", () => setBodymapTool("erase"));
  document.getElementById("toolClear").addEventListener("click", () => bodymapPad.clear());
  function setBodymapTool(mode) {
    bodymapPad.setMode(mode);
    document.getElementById("toolDraw").classList.toggle("active", mode === "draw");
    document.getElementById("toolErase").classList.toggle("active", mode === "erase");
  }

  // Unterschrift-Canvases
  const patientSig = new DrawablePad(document.getElementById("sigPatient"), { color: "#1f2933", alpha: 1, lineWidth: 3, eraseWidth: 20 });
  const sorgeSig = new DrawablePad(document.getElementById("sigSorge"), { color: "#1f2933", alpha: 1, lineWidth: 3, eraseWidth: 20 });
  document.querySelectorAll(".sig-clear").forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.target;
      (target === "sigPatient" ? patientSig : sorgeSig).clear();
    });
  });

  function resizeAllCanvases() {
    requestAnimationFrame(() => {
      bodymapPad.resize();
      patientSig.resize();
      sorgeSig.resize();
    });
  }
  window.addEventListener("resize", resizeAllCanvases);
  document.getElementById("bodymapImg").addEventListener("load", resizeAllCanvases);

  /* ---------- Zusammenfassung ---------- */

  function val(id) { return document.getElementById(id).value.trim(); }
  function checkedRadio(name) { const r = document.querySelector(`input[name="${name}"]:checked`); return r ? r.value : null; }

  function renderSummary() {
    const box = document.getElementById("summaryBox");
    const name = val("pName") || '<span class="missing">fehlt</span>';
    const geb = val("pGeb") ? formatDateDE(val("pGeb")) : '<span class="missing">fehlt</span>';
    const consent = checkedRadio("einwilligung");
    const consentTxt = consent === "ja" ? "Ja, ich willige ein" : consent === "nein" ? "Nein" : '<span class="missing">fehlt</span>';
    box.innerHTML = `
      <dl>
        <dt>Name</dt><dd>${name}</dd>
        <dt>Geburtsdatum</dt><dd>${geb}</dd>
        <dt>Behandlungsdatum</dt><dd>${val("datum") ? formatDateDE(val("datum")) : formatDateDE(new Date().toISOString().slice(0,10))}</dd>
        <dt>Einwilligung MR-Tomographie</dt><dd>${consentTxt}</dd>
        <dt>Unterschrift Patient/in</dt><dd>${patientSig.isEmpty() ? '<span class="missing">fehlt</span>' : "vorhanden"}</dd>
      </dl>`;
  }

  /* ---------- PDF-Erzeugung ---------- */

  const { jsPDF } = window.jspdf;

  function buildPdf() {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const marginL = 18, marginR = 18;
    const contentW = pageW - marginL - marginR;
    let y = 0;

    function addLetterhead() {
      y = 16;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text(PRAXIS.name, marginL, y);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      y += 5;
      doc.text(PRAXIS.aerzte, marginL, y);
      y += 4.2;
      doc.text(PRAXIS.adresse, marginL, y);
      y += 4.2;
      doc.text(PRAXIS.telefon, marginL, y);
      y += 3;
      doc.setDrawColor(180);
      doc.line(marginL, y, pageW - marginR, y);
      y += 8;
    }

    function ensureSpace(h) {
      if (y + h > pageH - 16) {
        doc.addPage();
        addLetterhead();
      }
    }

    function heading(text) {
      ensureSpace(10);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12.5);
      doc.setTextColor(20, 85, 129);
      doc.text(text, marginL, y);
      doc.setTextColor(0, 0, 0);
      y += 6;
    }

    function subheading(text) {
      ensureSpace(8);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.text(text, marginL, y);
      y += 5.5;
    }

    function bodyText(text, opts) {
      opts = opts || {};
      doc.setFont("helvetica", opts.bold ? "bold" : "normal");
      doc.setFontSize(opts.size || 10);
      const lines = doc.splitTextToSize(text, contentW);
      lines.forEach(line => {
        ensureSpace(5.2);
        doc.text(line, marginL, y);
        y += 5.2;
      });
    }

    function checkbox(x, yy, checked, label, labelWidth) {
      const size = 3.6;
      doc.setDrawColor(60);
      doc.setLineWidth(0.3);
      doc.rect(x, yy - size + 0.8, size, size);
      if (checked) {
        doc.setLineWidth(0.5);
        doc.line(x + 0.4, yy - size + 1.2, x + size - 0.4, yy - 0.6);
        doc.line(x + size - 0.4, yy - size + 1.2, x + 0.4, yy - 0.6);
      }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      const lines = labelWidth ? doc.splitTextToSize(label, labelWidth) : [label];
      doc.text(lines, x + size + 2, yy);
      return lines.length;
    }

    function fieldLine(label, value) {
      ensureSpace(6.5);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.text(label + ":", marginL, y);
      const labelW = doc.getTextWidth(label + ":  ");
      doc.setFont("helvetica", "normal");
      doc.text(value || "-", marginL + labelW + 2, y);
      y += 6.5;
    }

    function yesNoLine(question, answerVal, detail) {
      ensureSpace(9);
      const startY = y;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      const qLines = doc.splitTextToSize(question, contentW - 30);
      doc.text(qLines, marginL, y);
      const jaChecked = answerVal === "ja";
      const neinChecked = answerVal === "nein";
      checkbox(pageW - marginR - 26, startY, jaChecked, "Ja");
      checkbox(pageW - marginR - 12, startY, neinChecked, "Nein");
      y += qLines.length * 5.2;
      if (detail) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(9);
        const dLines = doc.splitTextToSize("- " + detail, contentW);
        ensureSpace(dLines.length * 4.6);
        doc.text(dLines, marginL + 3, y);
        y += dLines.length * 4.6;
      }
      y += 2;
      doc.setDrawColor(225);
      doc.line(marginL, y - 1.5, pageW - marginR, y - 1.5);
    }

    /* ---- Seite 1: Deckblatt / Patientendaten ---- */
    addLetterhead();
    heading("Anamnese- und Aufklärungsbogen – MR-Tomographie");
    y += 1;
    fieldLine("Name, Vorname", val("pName"));
    fieldLine("Geburtsdatum", val("pGeb") ? formatDateDE(val("pGeb")) : "");
    fieldLine("Telefonnummer", val("pTel"));
    fieldLine("E-Mail-Adresse", val("pMail"));
    y += 2;

    subheading("Ich habe die Aufklärung zur MR-Untersuchung gelesen und verstanden.");
    checkbox(marginL, y, document.getElementById("ackInfo").checked, "Bestätigt", 40);
    y += 8;

    heading("Sicherheitsfragen zur MRT-Tauglichkeit");
    yesNoLine("Tragen Sie einen Herzschrittmacher oder eine künstliche Herzklappe?", checkedRadio("herzschrittmacher"));
    yesNoLine("Wurde bei Ihnen schon eine MR-Tomographie durchgeführt?", checkedRadio("vorherige_mrt"));
    yesNoLine("Leiden Sie an Klaustrophobie (Beklemmungen in engen Räumen)?", checkedRadio("klaustrophobie"));
    yesNoLine("Haben Sie Metallteile im/am Körper (Clips, Metallsplitter, Hörgerät, Neurostimulatoren, Stents, Implantate, Piercings, Tätowierungen etc.)?", checkedRadio("metallteile"), checkedRadio("metallteile") === "ja" ? val("metallteile_detail") : null);
    yesNoLine("Sind bei Ihnen Allergien bekannt?", checkedRadio("allergien"), checkedRadio("allergien") === "ja" ? val("allergien_detail") : null);
    yesNoLine("Gab es bei früheren Untersuchungen Kontrastmittel-Reaktionen?", checkedRadio("kontrastmittel_reaktion"));
    yesNoLine("Leiden Sie an einer Nierenerkrankung (Einschränkung der Nierenfunktion)?", checkedRadio("niere"));
    yesNoLine("Könnten Sie schwanger sein?", checkedRadio("schwanger"));
    yesNoLine("Ist bei Ihnen eine Infektionskrankheit bekannt (HIV, Hepatitis, TBC)?", checkedRadio("infektion"));

    y += 2;
    fieldLine("Körpergewicht", val("gewicht") ? val("gewicht") + " kg" : "");
    fieldLine("Körpergröße", val("groesse") ? val("groesse") + " cm" : "");

    const vermerke = val("vermerke");
    if (vermerke) {
      subheading("Vermerke zum Aufklärungsgespräch");
      bodyText(vermerke);
    }

    /* ---- Fragebogen zur Gesundheit ---- */
    doc.addPage();
    addLetterhead();
    heading("Fragebogen zu Ihrer Gesundheit");

    subheading("1.0  Wo haben Sie momentan Schmerzen?");
    if (document.getElementById("keineBeschwerden").checked) {
      checkbox(marginL, y, true, "Ich habe keine Beschwerden, ich bin aus prophylaktischen Gründen hier.", contentW - 8);
      y += 6;
    } else {
      const bereiche = Array.from(document.querySelectorAll("#bereichGrid input:checked")).map(i => i.value);
      const andere = val("andereBereich");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      ensureSpace(6);
      doc.text("Beschwerden im Bereich:", marginL, y);
      y += 6;
      let x = marginL + 3;
      ["Lendenwirbelsäule", "Brustwirbelsäule", "Halswirbelsäule", "Gelenke"].forEach(b => {
        const w = checkbox(x, y, bereiche.includes(b), b);
        x += doc.getTextWidth(b) + 14;
        if (x > pageW - marginR - 30) { x = marginL + 3; y += 6; }
      });
      y += 7;
      if (andere) fieldLine("Andere", andere);

      const akutOn = document.getElementById("akutChk").checked;
      const chronOn = document.getElementById("chronischChk").checked;
      ensureSpace(6);
      checkbox(marginL, y, akutOn, `akut seit: ${val("akutTage") || "-"} Tage / ${val("akutWochen") || "-"} Wochen`, contentW - 8);
      y += 6.5;
      checkbox(marginL, y, chronOn, `chronisch seit: ${val("chronischMonate") || "-"} Monate / ${val("chronischJahre") || "-"} Jahre`, contentW - 8);
      y += 8;

      subheading("1.1  Markierte Schmerzbereiche (Körperschema)");
      const img = document.getElementById("bodymapImg");
      const compW = contentW;
      const compH = compW * (img.naturalHeight / img.naturalWidth || 0.47);
      ensureSpace(compH + 4);
      const composite = compositeBodymap();
      if (composite) doc.addImage(composite, "PNG", marginL, y, compW, compH);
      y += compH + 8;
    }

    subheading("2.0  Wie sind Ihre Schmerzen?");
    const selected = Array.from(document.querySelectorAll("#schmerzGrid input:checked")).map(i => i.value);
    if (selected.length === 0) {
      bodyText("Keine Angabe.");
    } else {
      const colW = contentW / 2;
      let colX = [marginL, marginL + colW];
      let colY = [y, y];
      let col = 0;
      selected.forEach(text => {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        const lines = doc.splitTextToSize(text, colW - 8);
        const h = lines.length * 4.8 + 1.5;
        if (colY[col] + h > pageH - 16) {
          doc.addPage(); addLetterhead();
          colY = [y, y];
        }
        checkbox(colX[col], colY[col] + 3.4, true, text, colW - 8);
        colY[col] += h;
        col = 1 - col;
      });
      y = Math.max(colY[0], colY[1]) + 4;
    }

    /* ---- Einwilligung & Unterschrift ---- */
    doc.addPage();
    addLetterhead();
    heading("Einwilligung");
    bodyText("Ich habe mir meine Entscheidung gründlich überlegt; ich benötige keine weitere Überlegungsfrist. Ich willige in die MR-Tomographie ein.");
    y += 2;
    const consent = checkedRadio("einwilligung");
    checkbox(marginL, y, consent === "ja", "Ja", 20);
    checkbox(marginL + 25, y, consent === "nein", "Nein", 20);
    y += 10;

    const ort = val("ort") || "-";
    const datum = val("datum") ? formatDateDE(val("datum")) : formatDateDE(new Date().toISOString().slice(0, 10));
    fieldLine("Ort, Datum", `${ort}, ${datum}`);
    y += 4;

    subheading("Unterschrift Patient/in, Betreuer, Eltern");
    if (!patientSig.isEmpty()) {
      const sigW = 70, sigH = 25;
      ensureSpace(sigH + 4);
      doc.addImage(patientSig.dataURL(), "PNG", marginL, y, sigW, sigH);
      doc.setDrawColor(150);
      doc.line(marginL, y + sigH + 1, marginL + sigW, y + sigH + 1);
      y += sigH + 6;
    } else {
      doc.setDrawColor(150);
      ensureSpace(20);
      doc.line(marginL, y + 18, marginL + 70, y + 18);
      y += 22;
    }

    if (document.getElementById("minderjaehrig").checked) {
      y += 4;
      subheading("Bei minderjährigen Patienten");
      bodyText("Mit der Durchführung der Untersuchung und einer evtl. notwendigen Kontrastmittelgabe bei meiner Tochter/meinem Sohn bin ich einverstanden.");
      fieldLine("Name des/der Sorgeberechtigten", val("sorgeberechtigter"));
      y += 2;
      subheading("Unterschrift Sorgeberechtigte(r)");
      if (!sorgeSig.isEmpty()) {
        const sigW = 70, sigH = 25;
        ensureSpace(sigH + 4);
        doc.addImage(sorgeSig.dataURL(), "PNG", marginL, y, sigW, sigH);
        doc.setDrawColor(150);
        doc.line(marginL, y + sigH + 1, marginL + sigW, y + sigH + 1);
        y += sigH + 6;
      }
    }

    y += 6;
    ensureSpace(16);
    doc.setDrawColor(150);
    doc.line(marginL, y + 14, marginL + 70, y + 14);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    doc.text("Unterschrift des Arztes/der Ärztin (vor Ort)", marginL, y + 18);

    /* Fußzeile mit Seitenzahlen */
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(140);
      doc.text(`Seite ${i} von ${pageCount}`, pageW - marginR, pageH - 8, { align: "right" });
      doc.text("Erstellt mit dem digitalen Anamnesebogen", marginL, pageH - 8);
      doc.setTextColor(0);
    }

    return doc;
  }

  function compositeBodymap() {
    const img = document.getElementById("bodymapImg");
    if (!img.naturalWidth) return null;
    const MAX_W = 1000; // ausreichend für Druck bei geringer Dateigröße
    const scale = Math.min(1, MAX_W / img.naturalWidth);
    const c = document.createElement("canvas");
    c.width = Math.round(img.naturalWidth * scale);
    c.height = Math.round(img.naturalHeight * scale);
    const ctx = c.getContext("2d");
    ctx.drawImage(img, 0, 0, c.width, c.height);
    ctx.drawImage(bodymapCanvas, 0, 0, c.width, c.height);
    return c.toDataURL("image/png");
  }

  document.getElementById("generatePdfBtn").addEventListener("click", () => {
    if (!validateStep(5)) { showStep(5); return; }
    const status = document.getElementById("pdfStatus");
    try {
      const doc = buildPdf();
      const nameSlug = (val("pName") || "Patient").replace(/[^a-zA-Z0-9äöüÄÖÜß]+/g, "_");
      const dateSlug = (val("datum") || new Date().toISOString().slice(0, 10)).replace(/-/g, "");
      doc.save(`Anamnesebogen_${nameSlug}_${dateSlug}.pdf`);
      status.textContent = "PDF wurde erstellt und heruntergeladen.";
      status.className = "pdf-status ok";
    } catch (err) {
      console.error(err);
      status.textContent = "Fehler beim Erstellen des PDF: " + err.message;
      status.className = "pdf-status err";
    }
  });

  /* ---------- Init ---------- */
  showStep(1);
})();
