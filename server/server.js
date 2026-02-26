import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import PDFDocument from "pdfkit";
import fs from "fs";
import crypto from "crypto";
import path from "path";

// ========= Banque de sujets =========
const DATA_DIR = "./data";
const LIMITE_GENERATE = 6;
const LIMITE_PDF = 2;

function loadSujets(niveau, matiere) {
  try {
    const dir = path.join(DATA_DIR, niveau, matiere);
    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
    return files.map((f) => {
      return JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
    });
  } catch {
    return [];
  }
}

// ========= Cache =========
const CACHE_FILE = "./cache.json";

function readCache() {
  try {
    return JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
  } catch {
    return {};
  }
}

function writeCache(cache) {
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}

function getCacheKey(text, mode, language) {
  const raw = `${mode}__${language}__${String(text).trim().slice(0, 300)}`;
  return crypto.createHash("md5").update(raw).digest("hex");
}

//====== fin cache =========/

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ========= Config =========
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ========= Usage store (MVP) =========
// NOTE: en mémoire → reset quand le serveur redémarre (OK pour MVP)
// ========= Usage store (fichier JSON) =========
const QUOTA_FILE = "./quotas.json";

function readQuotas() {
  try {
    return JSON.parse(fs.readFileSync(QUOTA_FILE, "utf8"));
  } catch {
    return {};
  }
}

function writeQuotas(quotas) {
  fs.writeFileSync(QUOTA_FILE, JSON.stringify(quotas, null, 2));
}

function checkLimit(id, type, limit) {
  const today = new Date().toDateString();
  const safeId = id || "anonymous";

  const quotas = readQuotas();

  if (!quotas[safeId] || quotas[safeId].date !== today) {
    quotas[safeId] = { date: today, generate: 0, pdf: 0 };
  }

  if ((quotas[safeId][type] ?? 0) >= limit) return false;

  quotas[safeId][type] = (quotas[safeId][type] ?? 0) + 1;
  writeQuotas(quotas);
  return true;
}

// ========= Middlewares =========
app.use(
  cors({
    origin: true, // accepte localhost:* (MVP)
    credentials: false,
  }),
);
app.use(express.json({ limit: "1mb" }));

// ========= Helpers =========
function requireApiKey(res) {
  if (!process.env.OPENAI_API_KEY) {
    res
      .status(500)
      .json({ error: "Clé OPENAI_API_KEY manquante dans server/.env" });
    return false;
  }
  return true;
}

function extractJsonOrThrow(raw) {
  // tente parse direct
  try {
    return JSON.parse(raw);
  } catch {}

  // tente d'extraire un bloc JSON entre { ... }
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    const maybe = raw.slice(start, end + 1);
    return JSON.parse(maybe);
  }

  throw new Error("La réponse IA n'est pas un JSON valide.");
}

// =================================== ROUTES ====================================

// ================ Test route =================
app.get("/", (req, res) => {
  res.send("OK ✅ Serveur SVT Prep en ligne");
});

// ========= Route IA (BAC D) svt =====================
app.post("/generate", async (req, res) => {
  try {
    const { text, language, anonymousId } = req.body;

    if (!checkLimit(anonymousId, "generate", LIMITE_GENERATE)) {
      return res.status(429).json({
        error:
          "Vous avez atteint votre limite de 6 générations gratuites aujourd'hui. Revenez demain ou contactez-nous sur WhatsApp pour accéder à la version Premium illimitée.",
      });
    }

    if (!requireApiKey(res)) return;
    if (!text || String(text).trim().length < 3) {
      return res
        .status(400)
        .json({ error: "Saisis au moins un thème ou un chapitre." });
    }
    // ======= langue ==========
    const langInstruction =
      language === "en"
        ? "Answer in clear simple English used in Cameroon schools."
        : "Réponds en français simple (style Cameroun).";

    // ====== Charge les sujets de référence ======
    const sujetsRef = loadSujets("bac", "svt");
    const sujetsContext =
      sujetsRef.length > 0
        ? `Voici des exemples de vrais sujets BAC Cameroun pour t'inspirer :
${JSON.stringify(sujetsRef.slice(0, 2), null, 2)}`
        : "";

    const prompt = `
Tu es un professeur expérimenté de SVT au Cameroun, spécialiste du BAC D.
Tu connais parfaitement le programme officiel camerounais.
Si tu n'es pas certain d'une information, indique-le explicitement.
Ne jamais inventer un fait scientifique sans le signaler.
${langInstruction}

À partir du texte ci-dessous, réponds STRICTEMENT en JSON valide avec ce format EXACT :

{
  "resume": {
    "definition": "2-3 lignes de définition du thème",
    "mecanismes": ["mécanisme 1", "mécanisme 2", "mécanisme 3"],
    "schemas_importants": [
      {
        "titre": "Nom du schéma",
        "instructions": "Ce que l'élève doit dessiner exactement",
        "elements_obligatoires": ["élément 1", "élément 2", "élément 3"]
      }
    ],
    "mots_cles_scientifiques": ["mot 1", "mot 2", "mot 3"],
    "conclusion": "2-3 lignes de synthèse"
  },
  "points_cles": ["point 1", "point 2", "point 3"],
  "flashcards": [
    {"q": "question 1", "a": "réponse 1"},
    {"q": "question 2", "a": "réponse 2"}
  ],
  "qcm": [
    {
      "question": "question 1",
      "options": ["option A", "option B", "option C", "option D"],
      "bonne_reponse": "A",
      "explication": "explication 1"
    }
  ],
  "mots_cles": ["mot 1", "mot 2", "mot 3"],
  "exercice_type_bac": {
    "consigne": "consigne de l'exercice",
    "enonce": "énoncé de l'exercice",
    "questions": [
      {"numero": 1, "question": "question 1", "bareme": 2},
      {"numero": 2, "question": "question 2", "bareme": 3},
      {"numero": 3, "question": "question 3", "bareme": 3}
    ],
    "corrige": {
      "reponses": [
        {"numero": 1, "reponse": "réponse détaillée 1"},
        {"numero": 2, "reponse": "réponse détaillée 2"},
        {"numero": 3, "reponse": "réponse détaillée 3"}
      ],
      "bareme_total": 8
    }
  }
}

Règles:
- Écris en ${language === "en" ? "simple English adapted for Cameroonian students" : "français simple adapté aux élèves camerounais"}.
- QCM: exactement 5 questions, 4 options chacune.
- Flashcards: exactement 5.
- exercice_type_bac: 1 exercice avec 3 questions basé sur le style BAC D Cameroun.
- Questions du plus simple au plus complexe.
- Corrigé détaillé et pédagogique.
- Reste fidèle au texte fourni.
- Ne mets aucun texte en dehors du JSON.

${sujetsContext}

Texte:
"""${String(text).trim()}"""
`.trim();

    // ===== cache en action ======/
    // Vérifie le cache
    const cacheKey = getCacheKey(text, "bac", language);
    const cache = readCache();

    if (cache[cacheKey]) {
      return res.json(cache[cacheKey]);
    }

    const response = await client.responses.create({
      // ⚠️ Mets ici un modèle que TON compte supporte (ex: "gpt-4.1-mini")
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      input: prompt,
    });

    const raw = response.output_text ?? "";
    let json;

    try {
      json = extractJsonOrThrow(raw);
      // Sauvegarde dans le cache
      cache[cacheKey] = json;
      writeCache(cache);
    } catch (e) {
      return res.status(500).json({
        error: e.message || "La réponse IA n'est pas un JSON valide.",
        raw,
      });
    }

    return res.json(json);
  } catch (err) {
    return res.status(500).json({ error: err.message || "Erreur serveur" });
  }
});

// ==== Route IA ENS svt concours ====
app.post("/generate-ens", async (req, res) => {
  try {
    const { text, language, anonymousId } = req.body;

    if (!checkLimit(anonymousId, "generate", LIMITE_GENERATE)) {
      return res.status(429).json({
        error:
          "Vous avez atteint votre limite de 6 générations gratuites aujourd'hui. Revenez demain ou contactez-nous sur WhatsApp pour accéder à la version Premium illimitée.",
      });
    }

    if (!requireApiKey(res)) return;

    if (!text || String(text).trim().length < 3) {
      return res.status(400).json({
        error: "Colle au moins 80 caractères (niveau ENS, plus de contexte).",
      });
    }

    const langInstruction =
      language === "en"
        ? "Answer in clear simple English used in Cameroon schools."
        : "Réponds en français simple (style Cameroun).";

    const sujetsRef = loadSujets("ens", "biologie");
    const sujetsContext =
      sujetsRef.length > 0
        ? `Voici des exemples de vrais sujets ENS Yaoundé pour t'inspirer :
${JSON.stringify(sujetsRef.slice(0, 2), null, 2)}`
        : "";

    const prompt = `
Tu es un examinateur officiel du concours ENS Yaoundé (2nd cycle / DIPES II) en Biologie/SVT.
Tu connais parfaitement les critères de correction et le style des sujets ENS Cameroun.
Si tu n'es pas certain d'une information, indique-le explicitement avec la mention [À VÉRIFIER].
Ne jamais inventer un barème ou une correction sans le signaler.
${langInstruction}

Objectif: produire un contenu orienté concours (méthode, sujets type, pièges, mini-barème).

Réponds STRICTEMENT en JSON valide avec ce format EXACT (aucun texte hors JSON) :

{
  "resume": {
  "definition": "2-5 lignes",
  "mecanismes": ["mécanisme 1", "mécanisme 2"],
  "schemas_importants": [
    {
      "titre": "Nom du schéma",
      "instructions": "Ce que l'élève doit dessiner",
      "elements_obligatoires": ["élément 1", "élément 2"]
    }
  ],
  "conclusion": "2-5 lignes de synthèse"
},
  "notions_a_maitriser": ["..."],
  "pieges_frequents": ["..."],
  "plan_revision_7j": [
    {"jour": 1, "objectif": "...", "taches": ["...","..."]},
    {"jour": 2, "objectif": "...", "taches": ["...","..."]},
    {"jour": 3, "objectif": "...", "taches": ["...","..."]},
    {"jour": 4, "objectif": "...", "taches": ["...","..."]},
    {"jour": 5, "objectif": "...", "taches": ["...","..."]},
    {"jour": 6, "objectif": "...", "taches": ["...","..."]},
    {"jour": 7, "objectif": "...", "taches": ["...","..."]}
  ],
  "questions_type_ens": [
    {"question": "...", "attendus": ["...","..."], "plan_reponse": ["I ...", "II ...", "III ..."]},
    {"question": "...", "attendus": ["...","..."], "plan_reponse": ["I ...", "II ...", "III ..."]}
  ],
  "qcm": [
    {"question": "...", "options": ["A ...","B ...","C ...","D ..."], "bonne_reponse": "A", "explication": "..."}
  ],
  "exercice_type": {
    "enonce": "...",
    "corrige": {"etapes": ["...","..."], "resultat": "..."}
  },
  "mini_bareme": [
    {"element": "Définitions/Notions", "points": 4},
    {"element": "Raisonnement/Analyse", "points": 8},
    {"element": "Schéma/Exemple", "points": 4},
    {"element": "Conclusion/Clarté", "points": 4}
  ],
  "mots_cles": ["..."]
}

Contraintes:
- qcm: exactement 10 questions (4 options).
- questions_type_ens: exactement 2.
- plan_revision_7j: exactement 7 jours.
- exercice_type: 1 exercice + corrigé, qui doit être détaillé et pédagogique..
- Reste fidèle au texte fourni, ne invente pas de contenu hors du texte.
- Signale toute information incertaine avec [À VÉRIFIER].
- Ne mets aucun texte en dehors du JSON.

${sujetsContext}
Texte à analyser:
"""${String(text).trim()}"""
`.trim();

    // ===== cache en action ===== /
    const cacheKey = getCacheKey(text, "ens", language);
    const cache = readCache();

    if (cache[cacheKey]) {
      return res.json(cache[cacheKey]);
    }

    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      input: prompt,
    });

    const raw = response.output_text ?? "";
    let json;

    try {
      json = extractJsonOrThrow(raw);
      // === Sauvegarde dans le cache === /
      cache[cacheKey] = json;
      writeCache(cache);
    } catch (e) {
      return res.status(500).json({
        error: e.message || "La réponse IA ENS n'est pas un JSON valide.",
        raw,
      });
    }

    return res.json(json);
  } catch (err) {
    console.error("❌ /generate-ens error:", err);
    return res.status(500).json({ error: err.message || "Erreur serveur" });
  }
});

// ===== Export PDF ENS =====
app.post("/export-ens-pdf", async (req, res) => {
  try {
    const data = req.body;
    const { anonymousId } = data;

    if (!checkLimit(anonymousId, "pdf", LIMITE_PDF)) {
      return res.status(429).json({
        error:
          "Vous avez atteint votre limite de 2 PDF gratuit aujourd'hui. Revenez demain ou contactez-nous sur WhatsApp pour accéder à la version Premium illimitée.",
      });
    }

    if (!data || !data.resume) {
      return res.status(400).json({ error: "Body JSON ENS manquant." });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="ENS_Biologie_Plan.pdf"',
    );

    const doc = new PDFDocument({ margin: 50, size: "A4" });
    doc.pipe(res);

    const safe = (v) => (v == null ? "" : String(v));

    // ====== Couleurs ======
    const BLEU = "#1a3a6b";
    const VERT = "#1a6b3a";
    const GRIS = "#f5f5f5";
    const NOIR = "#222222";

    // ====== Helpers ======
    const pageWidth = doc.page.width - 100;

    function addPageNumber() {
      const range = doc.bufferedPageRange();
      for (let i = 0; i < range.count; i++) {
        doc.switchToPage(range.start + i);
        doc
          .fontSize(9)
          .fillColor("#999999")
          .text(`PrepConcours AI — Page ${i + 1}`, 50, doc.page.height - 40, {
            align: "center",
            width: pageWidth,
          });
      }
    }

    function addPageGarde() {
      doc.rect(0, 0, doc.page.width, 200).fill(BLEU);
      doc
        .fillColor("white")
        .fontSize(26)
        .text("PrepConcours AI", 50, 60, { align: "center", width: pageWidth });
      doc.fontSize(16).text("Concours ENS Yaoundé — 2nd Cycle", 50, 100, {
        align: "center",
        width: pageWidth,
      });
      doc
        .fontSize(11)
        .text(`Généré le : ${new Date().toLocaleString("fr-FR")}`, 50, 135, {
          align: "center",
          width: pageWidth,
        });
      doc.moveDown(6);
    }

    function addSectionTitle(titre) {
      doc.moveDown(1.5);
      const y = doc.y;
      doc.rect(48, y, pageWidth + 4, 30).fill(BLEU);
      doc
        .fillColor("white")
        .fontSize(12)
        .font("Helvetica-Bold")
        .text(titre.toUpperCase(), 58, y + 8);
      doc.fillColor(NOIR).font("Helvetica");
      doc.moveDown(1.2);
    }

    function addSubTitle(titre) {
      doc.moveDown(0.5);
      doc
        .fillColor(VERT)
        .fontSize(11)
        .font("Helvetica-Bold")
        .text(titre)
        .font("Helvetica")
        .fillColor(NOIR)
        .moveDown(0.4);
    }

    function addPara(texte) {
      doc
        .fontSize(10)
        .fillColor(NOIR)
        .text(safe(texte), {
          align: "justify",
          lineGap: 3,
          width: pageWidth,
        })
        .moveDown(0.8);
    }

    function addBullets(items) {
      (items || []).forEach((x) => {
        doc
          .fontSize(10)
          .fillColor(NOIR)
          .text(`• ${safe(x)}`, {
            indent: 15,
            lineGap: 3,
            width: pageWidth - 15,
          });
        doc.moveDown(0.2);
      });
      doc.moveDown(0.6);
    }

    // ====== Page de garde ======
    addPageGarde();

    // ====== Résumé ======
    addSectionTitle("RESUME ORIENTE ENS");

    const resume = data.resume_oriente_ens || data.resume;

    if (typeof resume === "object" && resume !== null) {
      addSubTitle("Definition");
      addPara(safe(resume.definition));

      addSubTitle("Mecanismes essentiels");
      addBullets(resume.mecanismes || []);

      addSubTitle("Schemas importants a realiser");
      (resume.schemas_importants || []).forEach((s) => {
        if (typeof s === "object") {
          doc.fontSize(10).text(`• ${safe(s.titre)}`);
          doc.fontSize(10).text(`  ${safe(s.instructions)}`, { indent: 10 });
          doc
            .fontSize(10)
            .text(
              `  Elements : ${(s.elements_obligatoires || []).join(", ")}`,
              { indent: 10 },
            );
        } else {
          doc.fontSize(10).text(`• ${safe(s)}`);
        }
        doc.moveDown(0.3);
      });

      const motsCles =
        resume.mots_cles_scientifiques ||
        resume.mots_cles ||
        data.mots_cles ||
        [];
      if (motsCles.length > 0) {
        addSubTitle("Mots-cles scientifiques");
        addPara(motsCles.join(", "));
      }

      addSubTitle("Conclusion");
      addPara(safe(resume.conclusion));
    } else {
      addPara(safe(resume));
    }
    // ====== Notions ======
    addSectionTitle("Notions à maîtriser");
    addBullets(data.notions_a_maitriser || data.points_cles);

    // ====== Plan 7 jours ======
    addSectionTitle("Plan de révision — 7 jours");
    (data.plan_revision_7j || []).forEach((d) => {
      addSubTitle(`Jour ${safe(d.jour)} — ${safe(d.objectif)}`);
      (d.taches || []).forEach((t) => {
        doc.fontSize(10).text(`   - ${safe(t)}`);
      });
      doc.moveDown(0.4);
    });

    // ====== Pièges ======
    addSectionTitle("Pièges fréquents");
    addBullets(data.pieges_frequents);

    // ====== Questions longues ======
    addSectionTitle("Questions longues type ENS");
    (data.questions_type_ens || []).forEach((q, i) => {
      addSubTitle(`${i + 1}. ${safe(q.question)}`);
      doc.fontSize(10).text("Attendus :");
      (q.attendus || []).forEach((a) =>
        doc.fontSize(10).text(`   • ${safe(a)}`),
      );
      doc.moveDown(0.2);
      doc.fontSize(10).text("Plan de réponse :");
      (q.plan_reponse || []).forEach((p) =>
        doc.fontSize(10).text(`   - ${safe(p)}`),
      );
      doc.moveDown(0.6);
    });

    // ====== Barème ======
    addSectionTitle("Mini-barème (simulation /20)");
    (data.mini_bareme || []).forEach((b) => {
      doc.fontSize(10).text(`• ${safe(b.element)} — ${safe(b.points)} pts`);
    });
    doc.moveDown(0.6);

    // ====== Exercice ======
    if (data.exercice_type) {
      addSectionTitle("Exercice type ENS + Corrigé");
      addSubTitle("Énoncé");
      addPara(safe(data.exercice_type.enonce));
      addSubTitle("Corrigé");
      (data.exercice_type?.corrige?.etapes || []).forEach((e) => {
        doc.fontSize(10).text(`• ${safe(e)}`);
      });
      doc.moveDown(0.3);
      doc
        .fontSize(10)
        .fillColor(VERT)
        .text(`Résultat : ${safe(data.exercice_type?.corrige?.resultat)}`)
        .fillColor(NOIR);
    }

    // ====== Pied de page ======
    doc.moveDown(1);
    doc
      .fontSize(9)
      .fillColor("#999999")
      .text(
        "ATTENTION : Contenu généré par IA — A valider avec votre enseignant",
        {
          align: "center",
          width: pageWidth,
        },
      );

    // ====== Numérotation ======
    doc.flushPages();
    addPageNumber();

    doc.end();
  } catch (err) {
    console.error("❌ /export-ens-pdf error:", err);
    return res.status(500).json({ error: err.message || "Erreur PDF" });
  }
});

// ===== Export PDF BAC =====
app.post("/export-bac-pdf", async (req, res) => {
  try {
    const data = req.body;
    const { anonymousId } = data;

    if (!checkLimit(anonymousId, "pdf", LIMITE_PDF)) {
      return res.status(429).json({
        error:
          "Vous avez atteint votre limite de 2 PDF gratuit aujourd'hui. Revenez demain ou contactez-nous sur WhatsApp pour accéder à la version Premium illimitée.",
      });
    }

    if (!data || !data.resume) {
      return res.status(400).json({ error: "Body JSON BAC manquant." });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="BAC_PrepConcours.pdf"',
    );

    const doc = new PDFDocument({ margin: 50, size: "A4" });
    doc.pipe(res);

    const safe = (v) => (v == null ? "" : String(v));
    const BLEU = "#1a3a6b";
    const VERT = "#1a6b3a";
    const NOIR = "#222222";
    const pageWidth = doc.page.width - 100;

    // ====== Helpers ======
    function addPageNumber() {
      const range = doc.bufferedPageRange();
      for (let i = 0; i < range.count; i++) {
        doc.switchToPage(range.start + i);
        doc
          .fontSize(9)
          .fillColor("#999999")
          .text(`PrepConcours AI — Page ${i + 1}`, 50, doc.page.height - 40, {
            align: "center",
            width: pageWidth,
          });
      }
    }

    function addPageGarde() {
      doc.rect(0, 0, doc.page.width, 200).fill(BLEU);
      doc
        .fillColor("white")
        .fontSize(26)
        .font("Helvetica-Bold")
        .text("PrepConcours AI", 50, 60, { align: "center", width: pageWidth });
      doc.fontSize(16).text("BAC D — Fiche de Révision", 50, 100, {
        align: "center",
        width: pageWidth,
      });
      doc
        .fontSize(11)
        .font("Helvetica")
        .text(`Généré le : ${new Date().toLocaleString("fr-FR")}`, 50, 135, {
          align: "center",
          width: pageWidth,
        });
      doc.moveDown(6);
    }

    function addSectionTitle(titre) {
      doc.moveDown(1.5);
      const y = doc.y;
      doc.rect(48, y, pageWidth + 4, 30).fill(BLEU);
      doc
        .fillColor("white")
        .fontSize(12)
        .font("Helvetica-Bold")
        .text(titre.toUpperCase(), 58, y + 8);
      doc.fillColor(NOIR).font("Helvetica");
      doc.moveDown(1.2);
    }

    function addSubTitle(titre) {
      doc.moveDown(0.5);
      doc
        .fillColor(VERT)
        .fontSize(11)
        .font("Helvetica-Bold")
        .text(titre)
        .font("Helvetica")
        .fillColor(NOIR)
        .moveDown(0.4);
    }

    function addPara(texte) {
      doc
        .fontSize(10)
        .fillColor(NOIR)
        .text(safe(texte), { align: "justify", lineGap: 3, width: pageWidth })
        .moveDown(0.8);
    }

    function addBullets(items) {
      (items || []).forEach((x) => {
        doc
          .fontSize(10)
          .fillColor(NOIR)
          .text(`• ${safe(x)}`, {
            indent: 15,
            lineGap: 3,
            width: pageWidth - 15,
          });
        doc.moveDown(0.2);
      });
      doc.moveDown(0.6);
    }

    // ====== Page de garde ======
    addPageGarde();

    // ====== Résumé ======
    addSectionTitle("Resume");

    const resume = data.resume;

    if (typeof resume === "object" && resume !== null) {
      addSubTitle("Definition");
      addPara(safe(resume.definition));

      addSubTitle("Mecanismes essentiels");
      addBullets(resume.mecanismes || []);

      addSubTitle("Schemas importants a realiser");
      (resume.schemas_importants || []).forEach((s) => {
        if (typeof s === "object") {
          doc
            .fontSize(10)
            .font("Helvetica-Bold")
            .text(`• ${safe(s.titre)}`)
            .font("Helvetica");
          doc.fontSize(10).text(`  ${safe(s.instructions)}`, { indent: 10 });
          doc
            .fontSize(10)
            .text(
              `  Elements : ${(s.elements_obligatoires || []).join(", ")}`,
              { indent: 10 },
            );
        } else {
          doc.fontSize(10).text(`• ${safe(s)}`);
        }
        doc.moveDown(0.4);
      });

      const motsCles =
        resume.mots_cles_scientifiques ||
        resume.mots_cles ||
        data.mots_cles ||
        [];
      if (motsCles.length > 0) {
        addSubTitle("Mots-cles scientifiques");
        addPara(motsCles.join(", "));
      }

      addSubTitle("Conclusion");
      addPara(safe(resume.conclusion));
    } else {
      addPara(safe(resume));
    }

    // ====== Points clés ======
    addSectionTitle("Points cles");
    addBullets(data.points_cles || []);

    // ====== Flashcards ======
    addSectionTitle("Flashcards");
    (data.flashcards || []).forEach((card, i) => {
      addSubTitle(`${i + 1}. ${safe(card.q)}`);
      doc
        .fontSize(10)
        .fillColor(VERT)
        .text(`Reponse : ${safe(card.a)}`, {
          indent: 15,
          lineGap: 3,
          width: pageWidth - 15,
        })
        .fillColor(NOIR);
      doc.moveDown(0.5);
    });

    // ====== QCM ======
    addSectionTitle("QCM avec corrections");
    (data.qcm || []).forEach((q, i) => {
      doc
        .fontSize(10)
        .font("Helvetica-Bold")
        .text(`${i + 1}. ${safe(q.question)}`)
        .font("Helvetica");
      (q.options || []).forEach((opt, j) => {
        const lettre = ["A", "B", "C", "D"][j];
        const isBonne = lettre === q.bonne_reponse;
        doc
          .fontSize(10)
          .fillColor(isBonne ? VERT : NOIR)
          .text(`   ${lettre}. ${safe(opt)}`, { indent: 10 });
      });
      doc
        .fontSize(9)
        .fillColor("#555555")
        .text(`Explication : ${safe(q.explication)}`, {
          indent: 10,
          lineGap: 2,
        })
        .fillColor(NOIR);
      doc.moveDown(0.6);
    });

    // ====== Mots-clés ======
    addSectionTitle("Mots-cles");
    addPara((data.mots_cles || []).join(" — "));

    // ====== Pied de page ======
    doc.moveDown(1);
    doc
      .fontSize(9)
      .fillColor("#999999")
      .text(
        "ATTENTION : Contenu généré par IA — A valider avec votre enseignant",
        {
          align: "center",
          width: pageWidth,
        },
      );

    doc.flushPages();
    addPageNumber();
    doc.end();
  } catch (err) {
    console.error("❌ /export-bac-pdf error:", err);
    return res.status(500).json({ error: err.message || "Erreur PDF BAC" });
  }
});

// ========= Route IA (BAC D - Maths) =========
app.post("/generate-maths", async (req, res) => {
  try {
    const { text, language, anonymousId } = req.body;

    if (!checkLimit(anonymousId, "generate", LIMITE_GENERATE)) {
      return res.status(429).json({
        error:
          "Vous avez atteint votre limite de 6 générations gratuites aujourd'hui. Revenez demain ou contactez-nous sur WhatsApp pour accéder à la version Premium illimitée.",
      });
    }

    if (!requireApiKey(res)) return;

    if (!text || String(text).trim().length < 3) {
      return res
        .status(400)
        .json({ error: "Saisis au moins un thème ou un chapitre." });
    }

    const langInstruction =
      language === "en"
        ? "Answer in clear simple English used in Cameroon schools."
        : "Réponds en français simple (style Cameroun).";

    const sujetsRef = loadSujets("bac", "maths");
    const sujetsContext =
      sujetsRef.length > 0
        ? `Voici des exemples de vrais sujets BAC Maths Cameroun pour t'inspirer :
${JSON.stringify(sujetsRef.slice(0, 2), null, 2)}`
        : "";

    const cacheKey = getCacheKey(text, "bac-maths", language);
    const cache = readCache();

    if (cache[cacheKey]) {
      return res.json(cache[cacheKey]);
    }

    const prompt = `
Tu es un professeur expérimenté de Mathématiques au Cameroun, spécialiste du BAC D.
Tu connais parfaitement le programme officiel camerounais de Maths BAC D.
Si tu n'es pas certain d'une information, indique-le explicitement.
${langInstruction}

À partir du texte ci-dessous, réponds STRICTEMENT en JSON valide avec ce format EXACT :

{
  "resume": {
    "definition": "2-3 lignes de définition du thème mathématique",
    "mecanismes": ["propriété 1", "propriété 2", "propriété 3"],
    "schemas_importants": [
      {
        "titre": "Nom du schéma ou graphique",
        "instructions": "Ce que l'élève doit dessiner ou construire exactement",
        "elements_obligatoires": ["élément 1", "élément 2", "élément 3"]
      }
    ],
    "mots_cles_scientifiques": ["mot 1", "mot 2", "mot 3"],
    "conclusion": "2-3 lignes de synthèse"
  },
  "points_cles": ["point 1", "point 2", "point 3"],
  "flashcards": [
    {"q": "question 1", "a": "réponse 1"},
    {"q": "question 2", "a": "réponse 2"}
  ],
  "qcm": [
    {
      "question": "question 1",
      "options": ["option A", "option B", "option C", "option D"],
      "bonne_reponse": "A",
      "explication": "explication 1"
    }
  ],
  "mots_cles": ["mot 1", "mot 2", "mot 3"],
  "exercice_type_bac": {
    "consigne": "consigne de l'exercice",
    "enonce": "énoncé mathématique détaillé",
    "questions": [
      {"numero": 1, "question": "question simple", "bareme": 2},
      {"numero": 2, "question": "question intermédiaire", "bareme": 3},
      {"numero": 3, "question": "question complexe", "bareme": 3}
    ],
    "corrige": {
      "reponses": [
        {"numero": 1, "reponse": "solution détaillée étape par étape 1"},
        {"numero": 2, "reponse": "solution détaillée étape par étape 2"},
        {"numero": 3, "reponse": "solution détaillée étape par étape 3"}
      ],
      "bareme_total": 8
    }
  }
}

Règles:
- Écris en ${language === "en" ? "simple English adapted for Cameroonian students" : "français simple adapté aux élèves camerounais"}.
- QCM: exactement 5 questions, 4 options chacune.
- Flashcards: exactement 5.
- exercice_type_bac: 1 exercice mathématique avec 3 questions progressives.
- Les solutions doivent être détaillées étape par étape.
- Utilise la notation mathématique standard.
- Ne mets aucun texte en dehors du JSON.

${sujetsContext}

Texte:
"""${String(text).trim()}"""
`.trim();

    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      input: prompt,
    });

    const raw = response.output_text ?? "";
    let json;

    try {
      json = extractJsonOrThrow(raw);
      cache[cacheKey] = json;
      writeCache(cache);
    } catch (e) {
      return res.status(500).json({
        error: e.message || "La réponse IA Maths n'est pas un JSON valide.",
        raw,
      });
    }

    return res.json(json);
  } catch (err) {
    console.error("❌ /generate-maths error:", err);
    return res.status(500).json({ error: err.message || "Erreur serveur" });
  }
});

// ========= Route IA (BAC D - Physique-Chimie) =========
app.post("/generate-pc", async (req, res) => {
  try {
    const { text, language, anonymousId } = req.body;

    if (!checkLimit(anonymousId, "generate", LIMITE_GENERATE)) {
      return res.status(429).json({
        error:
          "Vous avez atteint votre limite de 6 générations gratuites aujourd'hui. Revenez demain ou contactez-nous sur WhatsApp pour accéder à la version Premium illimitée.",
      });
    }

    if (!requireApiKey(res)) return;

    if (!text || String(text).trim().length < 3) {
      return res
        .status(400)
        .json({ error: "Saisis au moins un thème ou un chapitre." });
    }

    const langInstruction =
      language === "en"
        ? "Answer in clear simple English used in Cameroon schools."
        : "Réponds en français simple (style Cameroun).";

    const sujetsRef = loadSujets("bac", "physique-chimie");
    const sujetsContext =
      sujetsRef.length > 0
        ? `Voici des exemples de vrais sujets BAC Physique-Chimie Cameroun :
${JSON.stringify(sujetsRef.slice(0, 2), null, 2)}`
        : "";

    const cacheKey = getCacheKey(text, "bac-pc", language);
    const cache = readCache();

    if (cache[cacheKey]) {
      return res.json(cache[cacheKey]);
    }

    const prompt = `
Tu es un professeur expérimenté de Physique-Chimie au Cameroun, spécialiste du BAC D.
Tu connais parfaitement le programme officiel camerounais de Physique-Chimie BAC D.
Si tu n'es pas certain d'une information, indique-le explicitement.
${langInstruction}

À partir du texte ci-dessous, réponds STRICTEMENT en JSON valide avec ce format EXACT :

{
  "resume": {
    "definition": "2-3 lignes de définition du thème",
    "mecanismes": ["propriété 1", "propriété 2", "propriété 3"],
    "schemas_importants": [
      {
        "titre": "Nom du schéma",
        "instructions": "Ce que l'élève doit dessiner exactement",
        "elements_obligatoires": ["élément 1", "élément 2", "élément 3"]
      }
    ],
    "mots_cles_scientifiques": ["mot 1", "mot 2", "mot 3"],
    "conclusion": "2-3 lignes de synthèse"
  },
  "points_cles": ["point 1", "point 2", "point 3"],
  "flashcards": [
    {"q": "question 1", "a": "réponse 1"},
    {"q": "question 2", "a": "réponse 2"}
  ],
  "qcm": [
    {
      "question": "question 1",
      "options": ["option A", "option B", "option C", "option D"],
      "bonne_reponse": "A",
      "explication": "explication 1"
    }
  ],
  "mots_cles": ["mot 1", "mot 2", "mot 3"],
  "exercice_type_bac": {
    "consigne": "consigne de l'exercice",
    "enonce": "énoncé détaillé avec données numériques si nécessaire",
    "questions": [
      {"numero": 1, "question": "question simple", "bareme": 2},
      {"numero": 2, "question": "question intermédiaire", "bareme": 3},
      {"numero": 3, "question": "question complexe avec calcul", "bareme": 3}
    ],
    "corrige": {
      "reponses": [
        {"numero": 1, "reponse": "solution détaillée étape par étape 1"},
        {"numero": 2, "reponse": "solution détaillée étape par étape 2"},
        {"numero": 3, "reponse": "solution détaillée avec calcul 3"}
      ],
      "bareme_total": 8
    }
  }
}

Règles:
- Écris en ${language === "en" ? "simple English adapted for Cameroonian students" : "français simple adapté aux élèves camerounais"}.
- QCM: exactement 5 questions, 4 options chacune.
- Flashcards: exactement 5.
- exercice_type_bac: 1 exercice avec 3 questions progressives incluant des calculs numériques.
- Les solutions doivent être détaillées étape par étape avec les formules utilisées.
- Utilise la notation scientifique standard.
- Ne mets aucun texte en dehors du JSON.

${sujetsContext}

Texte:
"""${String(text).trim()}"""
`.trim();

    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      input: prompt,
    });

    const raw = response.output_text ?? "";
    let json;

    try {
      json = extractJsonOrThrow(raw);
      cache[cacheKey] = json;
      writeCache(cache);
    } catch (e) {
      return res.status(500).json({
        error: e.message || "La réponse IA PC n'est pas un JSON valide.",
        raw,
      });
    }

    return res.json(json);
  } catch (err) {
    console.error("❌ /generate-pc error:", err);
    return res.status(500).json({ error: err.message || "Erreur serveur" });
  }
});

// 404 fallback (pratique)
app.use((req, res) => {
  res.status(404).json({ error: "Route introuvable" });
});

//Start server
app.listen(PORT, () => {
  console.log(`✅ Serveur démarré : http://localhost:${PORT}`);
});
