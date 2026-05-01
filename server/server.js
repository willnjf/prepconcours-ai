import express from "express";
import cors from "cors";
const LIMITE_GENERATE = 5;
const LIMITE_PDF = 2;
import dotenv from "dotenv";
import OpenAI from "openai";
import PDFDocument from "pdfkit";
import fs from "fs";
import crypto from "crypto";
import path from "path";

// ========= Banque de sujets =========
const DATA_DIR = "./data";

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
        error: `Vous avez atteint votre limite de ${LIMITE_GENERATE} générations gratuites aujourd'hui. Revenez demain ou contactez-nous sur WhatsApp pour accéder à la version Premium illimitée.`,
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
        error: `Vous avez atteint votre limite de ${LIMITE_GENERATE} générations gratuites aujourd'hui. Revenez demain ou contactez-nous sur WhatsApp pour accéder à la version Premium illimitée.`,
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
        error: `Vous avez atteint votre limite de ${LIMITE_PDF} PDF gratuit aujourd'hui. Revenez demain ou contactez-nous sur WhatsApp pour accéder à la version Premium illimitée.`,
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
        error: `Vous avez atteint votre limite de ${LIMITE_PDF} PDF gratuit aujourd'hui. Revenez demain ou contactez-nous sur WhatsApp pour accéder à la version Premium illimitée.`,
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
        error: `Vous avez atteint votre limite de ${LIMITE_GENERATE} générations gratuites aujourd'hui. Revenez demain ou contactez-nous sur WhatsApp pour accéder à la version Premium illimitée.`,
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
        error: `Vous avez atteint votre limite de ${LIMITE_GENERATE} générations gratuites aujourd'hui. Revenez demain ou contactez-nous sur WhatsApp pour accéder à la version Premium illimitée.`,
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

// ========= Route IA Generate Optimisé BAC =========
app.post("/generate-optimise", async (req, res) => {
  try {
    const { text, language, anonymousId, matiere } = req.body;

    // ← Une seule fois ici
    const langInstruction =
      language === "en"
        ? "Answer in clear simple English used in Cameroon schools."
        : "Réponds en français simple (style Cameroun).";

    const MATIERES_CONCOURS = [
      "ens-svt",
      "ens-maths",
      "ens-physique",
      "enset-maths",
      "enset-physique",
      "enset-info",
      "poly-maths",
      "poly-pc",
      "enam-culture",
      "enam-droit",
      "enam-economie",
      "esstic-culture",
      "esstic-français",
      "esstic-com",
      "fmsb-svt",
      "fmsb-pc",
      "fmsb-maths",
      "iai-info",
      "iai-maths",
    ];

    const isConcours = MATIERES_CONCOURS.includes(matiere);

    // ====== Prompt BAC ======
    const promptOptimiseBac = `
Tu es un enseignant expérimenté au Cameroun, spécialiste 
de la préparation et de la correction du Baccalauréat (MINSEC).
Tu es rigoureux, précis, pédagogique.
Tu n'inventes jamais d'informations non vérifiables.
Si une information sur la fréquence d'apparition au BAC 
n'est pas certaine, écris : "à vérifier selon les sujets officiels".
${langInstruction}

OBJECTIF : Produire un bloc Optimisé BAC pour le chapitre :
"${String(text).trim()}"

EXIGENCES PÉDAGOGIQUES :
- Questions progressives : connaissance → compréhension → application → analyse
- Niveau exact du Baccalauréat camerounais
- Termes scientifiques rigoureux
- Réponses en phrases complètes
- Barème détaillé et cohérent
- Aucun contenu approximatif ou hors programme
- Objectif : préparer un élève visant 16-18/20

Réponds STRICTEMENT en JSON valide avec ce format EXACT :

{
  "importance": "Très fréquent",
  "pourquoi_important": "Formulation prudente et académique. Si fréquence incertaine : à vérifier selon les sujets officiels",
  "competences_testees": [
    "compétence précise 1",
    "compétence précise 2",
    "compétence précise 3",
    "compétence précise 4"
  ],
  "types_exercices": [
    {
      "type": "Type d'exercice réaliste",
      "description": "Description conforme aux sujets officiels BAC",
      "frequence": "Très fréquent"
    },
    {
      "type": "Type d'exercice 2",
      "description": "Description précise",
      "frequence": "Fréquent"
    },
    {
      "type": "Type d'exercice 3",
      "description": "Description précise",
      "frequence": "à vérifier selon les sujets officiels"
    }
  ],
  "pieges_frequents": [
    "piège classique 1 des candidats",
    "piège classique 2",
    "piège classique 3",
    "piège classique 4"
  ],
  "conseils_examen": [
    "conseil pratique d'examinateur 1",
    "conseil pratique 2",
    "conseil pratique 3"
  ],
 
 "exercice_optimise": {
    "consigne": "Consigne officielle claire style BAC MINSEC",
    "enonce": "Énoncé structuré avec contexte scientifique précis",
    "questions": [
      {"numero": 1, "question": "Question de connaissance", "bareme": 2},
      {"numero": 2, "question": "Question de compréhension", "bareme": 3},
      {"numero": 3, "question": "Question d'application", "bareme": 4},
      {"numero": 4, "question": "Question d'analyse niveau BAC", "bareme": 3}
    ],
    "corrige": {
      "reponses": [
        {"numero": 1, "reponse": "Réponse complète en phrases, niveau 16-18/20"},
        {"numero": 2, "reponse": "Réponse complète en phrases, niveau 16-18/20"},
        {"numero": 3, "reponse": "Réponse complète en phrases, niveau 16-18/20"},
        {"numero": 4, "reponse": "Réponse complète en phrases, niveau 16-18/20"}
      ],
      "bareme_total": 12,
      "bareme_detail": [
        {"critere": "Exactitude scientifique", "points": 4},
        {"critere": "Structure et rédaction", "points": 3},
        {"critere": "Application des concepts", "points": 3},
        {"critere": "Schémas et illustrations", "points": 2}
      ]
    }
  }
}

Règles absolues:
- importance: exactement "Très fréquent", "Important" ou "Secondaire"
- Jamais de statistiques inventées
- Exercice conforme au style BAC MINSEC Cameroun
- Corrigé en phrases complètes visant 16-18/20
- Ne mets aucun texte en dehors du JSON.
`.trim();

    // ====== Prompt Concours ======
    const promptOptimiseConcours = `
Tu es un enseignant expérimenté au Cameroun, spécialiste 
de la préparation aux concours nationaux (ENS, ENSET, FMSB, Polytech).
Tu es rigoureux, exigeant, précis.
Tu respectes strictement le niveau réel des concours camerounais.
Tu n'inventes jamais de statistiques ou d'informations non vérifiables.
Si une information dépend d'une session spécifique, 
écris : "à vérifier selon session officielle".
${langInstruction}

OBJECTIF : Produire un bloc "Optimisé Concours" pour le chapitre :
"${String(text).trim()}"

EXIGENCES PÉDAGOGIQUES :
- Progression intellectuelle : connaissance → compréhension → 
  application → analyse → synthèse → démonstration
- Les dernières questions exigent un raisonnement structuré,
  une justification scientifique rigoureuse
- Niveau supérieur au BAC, conforme aux concours camerounais
- Barème détaillé et cohérent
- Corrigé rédigé comme une copie excellente niveau admissible
- Aucun contenu approximatif

Réponds STRICTEMENT en JSON valide avec ce format EXACT :

{
  "importance": "Incontournable",
  "niveau_difficulte": "Très élevé",
  "pourquoi_important": "Justification académique prudente du niveau attendu au concours. Si information incertaine : à vérifier selon session officielle",
  "difference_bac_concours": "Explication claire et précise de ce qui distingue le niveau BAC du niveau concours sur ce chapitre",
  "competences_selectionnees": [
    "compétence avancée exigée au concours 1",
    "compétence avancée 2",
    "compétence avancée 3",
    "compétence avancée 4",
    "compétence avancée 5"
  ],
  "types_questions_concours": [
    {
      "type": "Type de question concours",
      "description": "Description précise niveau concours",
      "frequence": "Très fréquent"
    },
    {
      "type": "Type 2",
      "description": "Description précise",
      "frequence": "Fréquent"
    },
    {
      "type": "Type 3",
      "description": "Description précise",
      "frequence": "à vérifier selon session officielle"
    }
  ],
  "difficultes_classiques": [
    "difficulté classique des candidats 1",
    "difficulté 2",
    "difficulté 3",
    "difficulté 4"
  ],
  "conseils_jury": [
    "conseil pour se démarquer aux yeux du jury 1",
    "conseil 2",
    "conseil 3"
  ],
  "exercice_type_concours": {
    "consigne": "Consigne officielle niveau concours national camerounais",
    "enonce": "Énoncé complexe et structuré avec contexte scientifique précis et données",
    "questions": [
      {"numero": 1, "question": "Question de connaissance", "bareme": 2},
      {"numero": 2, "question": "Question de compréhension", "bareme": 3},
      {"numero": 3, "question": "Question d'application", "bareme": 4},
      {"numero": 4, "question": "Question d'analyse", "bareme": 4},
      {"numero": 5, "question": "Question de synthèse", "bareme": 4},
      {"numero": 6, "question": "Question de démonstration ou raisonnement approfondi", "bareme": 3}
    ],
    "corrige": {
      "reponses": [
        {"numero": 1, "reponse": "Réponse complète niveau admissible, phrases rigoureuses"},
        {"numero": 2, "reponse": "Réponse complète niveau admissible, phrases rigoureuses"},
        {"numero": 3, "reponse": "Réponse complète niveau admissible, phrases rigoureuses"},
        {"numero": 4, "reponse": "Réponse complète niveau admissible, phrases rigoureuses"},
        {"numero": 5, "reponse": "Réponse complète niveau admissible, phrases rigoureuses"},
        {"numero": 6, "reponse": "Démonstration complète niveau admissible"}
      ],
      "bareme_total": 20,
      "bareme_detail": [
        {"critere": "Maîtrise scientifique", "points": 6},
        {"critere": "Capacité d'analyse et synthèse", "points": 6},
        {"critere": "Qualité de rédaction", "points": 4},
        {"critere": "Rigueur du raisonnement", "points": 4}
      ]
    }
  }
}

Règles absolues:
- importance: exactement "Incontournable", "Très important" ou "Important"
- niveau_difficulte: exactement "Très élevé", "Élevé" ou "Moyen"
- Jamais de statistiques inventées
- 6 questions progressives obligatoires
- Niveau concours national Cameroun
- Corrigé niveau candidat admissible
- Ne mets aucun texte en dehors du JSON.
`.trim();

    // ====== Choix du prompt ======
    const prompt = isConcours ? promptOptimiseConcours : promptOptimiseBac;

    if (!checkLimit(anonymousId, "generate", LIMITE_GENERATE)) {
      return res.status(429).json({
        error: `Vous avez atteint votre limite de ${LIMITE_GENERATE} générations gratuites aujourd'hui. Revenez demain ou contactez-nous sur WhatsApp pour accéder à la version Premium illimitée.`,
      });
    }

    if (!requireApiKey(res)) return;

    if (!text || String(text).trim().length < 3) {
      return res
        .status(400)
        .json({ error: "Saisis au moins un thème ou un chapitre." });
    }

    const cacheKey = getCacheKey(text, "optimise", language);
    const cache = readCache();

    if (cache[cacheKey]) {
      console.log("✅ Réponse Optimisé depuis le cache !");
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
      cache[cacheKey] = json;
      writeCache(cache);
    } catch (e) {
      return res.status(500).json({
        error: e.message || "La réponse IA Optimisé n'est pas un JSON valide.",
        raw,
      });
    }

    return res.json(json);
  } catch (err) {
    console.error("❌ /generate-optimise error:", err);
    return res.status(500).json({ error: err.message || "Erreur serveur" });
  }
});

// ========= Route PDF Optimisé =========
app.post("/export-optimise-pdf", async (req, res) => {
  try {
    const data = req.body;
    const anonymousId = data.anonymousId || "anonymous";

    if (!checkLimit(anonymousId, "pdf", LIMITE_PDF)) {
      return res.status(429).json({
        error: `Vous avez atteint votre limite de ${LIMITE_PDF} PDF gratuit aujourd'hui. Revenez demain ou contactez-nous sur WhatsApp pour accéder à la version Premium illimitée.`,
      });
    }

    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const pageWidth = 495;
    const BLEU = "#1a3a6b";
    const VERT = "#22c55e";
    const ORANGE = "#f97316";
    const NOIR = "#1a1a2e";

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=Optimise_PrepConcours.pdf",
    );
    doc.pipe(res);

    const safe = (v) => (v == null ? "" : String(v));

    // ====== Fonctions helpers ======
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
    doc.rect(0, 0, 595, 200).fill(BLEU);
    doc
      .fillColor("white")
      .fontSize(28)
      .font("Helvetica-Bold")
      .text("PrepConcours AI", 50, 60, { align: "center" });
    doc
      .fontSize(16)
      .text("Fiche Optimisée — BAC & Concours", { align: "center" });
    doc
      .fontSize(11)
      .font("Helvetica")
      .text(`Généré le : ${new Date().toLocaleString("fr-FR")}`, {
        align: "center",
      });
    doc.moveDown(4);

    // ====== Importance ======
    if (data.importance) {
      addSectionTitle("Importance pour le BAC / Concours");
      doc
        .fontSize(13)
        .font("Helvetica-Bold")
        .fillColor(ORANGE)
        .text(`⭐ ${safe(data.importance)}`)
        .font("Helvetica")
        .fillColor(NOIR);
      doc.moveDown(0.5);
      addPara(data.pourquoi_important);
    }

    // ====== Résumé normal ======
    if (data.resume) {
      addSectionTitle("Résumé du Chapitre");
      const resume = data.resume;
      if (typeof resume === "object") {
        addSubTitle("Définition");
        addPara(resume.definition);
        addSubTitle("Mécanismes essentiels");
        addBullets(resume.mecanismes || []);
        addSubTitle("Mots-clés scientifiques");
        addPara((resume.mots_cles_scientifiques || []).join(", "));
        addSubTitle("Conclusion");
        addPara(resume.conclusion);
      } else {
        addPara(resume);
      }
    }

    // ====== Compétences testées ======
    if (data.competences_testees) {
      addSectionTitle("Compétences Réellement Testées");
      addBullets(data.competences_testees);
    }

    // ====== Types d'exercices ======
    if (data.types_exercices || data.types_questions_concours) {
      addSectionTitle("Types d'Exercices");
      const types = data.types_exercices || data.types_questions_concours || [];
      types.forEach((t) => {
        doc
          .fontSize(10)
          .font("Helvetica-Bold")
          .fillColor(BLEU)
          .text(`• ${safe(t.type)}`)
          .font("Helvetica")
          .fillColor(NOIR);
        doc.fontSize(10).text(`  ${safe(t.description)}`, { indent: 15 });
        doc
          .fontSize(9)
          .fillColor(VERT)
          .text(`  Fréquence : ${safe(t.frequence)}`, { indent: 15 })
          .fillColor(NOIR);
        doc.moveDown(0.4);
      });
      doc.moveDown(0.6);
    }

    // ====== Pièges fréquents ======
    if (data.pieges_frequents || data.difficultes_classiques) {
      addSectionTitle("Pièges Fréquents");
      addBullets(data.pieges_frequents || data.difficultes_classiques);
    }

    // ====== Conseils ======
    if (data.conseils_examen || data.conseils_jury) {
      addSectionTitle("Conseils pour l'Examen");
      addBullets(data.conseils_examen || data.conseils_jury);
    }

    // ====== Différence BAC/Concours ======
    if (data.difference_bac_concours) {
      addSectionTitle("BAC vs Concours");
      addPara(data.difference_bac_concours);
    }

    // ====== Exercice type + Corrigé ======
    const exercice = data.exercice_optimise || data.exercice_type_concours;
    if (exercice) {
      addSectionTitle("Exercice Type + Corrigé");

      addSubTitle("Consigne");
      addPara(exercice.consigne);

      addSubTitle("Énoncé");
      addPara(exercice.enonce);

      addSubTitle("Questions");
      (exercice.questions || []).forEach((q) => {
        doc
          .fontSize(10)
          .font("Helvetica-Bold")
          .text(`${q.numero}. ${safe(q.question)}`)
          .font("Helvetica");
        doc
          .fontSize(9)
          .fillColor(ORANGE)
          .text(`   Barème : ${safe(q.bareme)} pts`)
          .fillColor(NOIR);
        doc.moveDown(0.3);
      });

      addSubTitle("Corrigé");
      (exercice.corrige?.reponses || []).forEach((r) => {
        doc
          .fontSize(10)
          .font("Helvetica-Bold")
          .text(`${r.numero}.`)
          .font("Helvetica");
        addPara(r.reponse);
      });

      // Barème détaillé
      addSubTitle("Barème détaillé");
      doc
        .fontSize(10)
        .font("Helvetica-Bold")
        .text(`Total : ${safe(exercice.corrige?.bareme_total)} pts`)
        .font("Helvetica");
      doc.moveDown(0.3);
      (exercice.corrige?.bareme_detail || []).forEach((b) => {
        doc
          .fontSize(10)
          .text(`• ${safe(b.critere)} : ${safe(b.points)} pts`, { indent: 15 });
        doc.moveDown(0.2);
      });
    }

    // ====== Footer ======
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(range.start + i);
      doc
        .fontSize(8)
        .fillColor("#888888")
        .text(
          "ATTENTION : Contenu généré par IA — À valider avec votre enseignant",
          50,
          780,
          { align: "center", width: pageWidth },
        );
      doc.text(`Page ${i + 1} / ${range.count}`, 50, 790, {
        align: "right",
        width: pageWidth,
      });
    }

    doc.end();
  } catch (err) {
    console.error("❌ /export-optimise-pdf error:", err);
    return res.status(500).json({ error: err.message || "Erreur serveur PDF" });
  }
});

// ========= Route IA (BAC A - Français/Littérature) =========
app.post("/generate-bac-a-francais", async (req, res) => {
  try {
    const { text, language, anonymousId } = req.body;

    if (!checkLimit(anonymousId, "generate", LIMITE_GENERATE)) {
      return res.status(429).json({
        error: `Vous avez atteint votre limite de ${LIMITE_GENERATE} générations gratuites aujourd'hui. Revenez demain ou contactez-nous sur WhatsApp pour accéder à la version Premium illimitée.`,
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

    const sujetsRef = loadSujets("bac", "francais");
    const sujetsContext =
      sujetsRef.length > 0
        ? `Voici des exemples de vrais sujets BAC Français Cameroun pour t'inspirer :
${JSON.stringify(sujetsRef.slice(0, 2), null, 2)}`
        : "";

    const cacheKey = getCacheKey(text, "bac-a-francais", language);
    const cache = readCache();

    if (cache[cacheKey]) {
      return res.json(cache[cacheKey]);
    }

    const prompt = `
Tu es un professeur expérimenté de Français et Littérature au Cameroun, spécialiste du BAC Série A.
Tu connais parfaitement le programme officiel camerounais (MINSEC).
Si tu n'es pas certain d'une information, indique-le explicitement.
${langInstruction}

À partir du texte ci-dessous, réponds STRICTEMENT en JSON valide avec ce format EXACT :

{
  "resume": {
    "definition": "2-3 lignes de présentation du thème ou de l'œuvre",
    "idees_principales": ["idée 1", "idée 2", "idée 3"],
    "auteurs_references": ["auteur 1 et son œuvre", "auteur 2 et son œuvre"],
    "procedes_litteraires": ["procédé 1", "procédé 2", "procédé 3"],
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
    "consigne": "consigne officielle style BAC Série A",
    "enonce": "Extrait de texte ou sujet de dissertation littéraire",
    "questions": [
      {"numero": 1, "question": "Question de compréhension", "bareme": 2},
      {"numero": 2, "question": "Question d'analyse littéraire", "bareme": 3},
      {"numero": 3, "question": "Question de production écrite", "bareme": 5}
    ],
    "corrige": {
      "reponses": [
        {"numero": 1, "reponse": "réponse détaillée et rédigée 1"},
        {"numero": 2, "reponse": "réponse détaillée et rédigée 2"},
        {"numero": 3, "reponse": "plan détaillé ou réponse rédigée 3"}
      ],
      "bareme_total": 10
    }
  }
}

Règles:
- Écris en ${language === "en" ? "simple English adapted for Cameroonian students" : "français simple adapté aux élèves camerounais"}.
- QCM : exactement 5 questions, 4 options chacune.
- Flashcards : exactement 5.
- exercice_type_bac : 1 exercice avec 3 questions progressives (compréhension → analyse → production).
- Corrigé détaillé et pédagogique, niveau BAC Série A Cameroun.
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
        error: e.message || "La réponse IA Français n'est pas un JSON valide.",
        raw,
      });
    }

    return res.json(json);
  } catch (err) {
    console.error("❌ /generate-bac-a-francais error:", err);
    return res.status(500).json({ error: err.message || "Erreur serveur" });
  }
});

// ========= Route IA (BAC A - Philosophie) =========
app.post("/generate-bac-a-philo", async (req, res) => {
  try {
    const { text, language, anonymousId } = req.body;

    if (!checkLimit(anonymousId, "generate", LIMITE_GENERATE)) {
      return res.status(429).json({
        error: `Vous avez atteint votre limite de ${LIMITE_GENERATE} générations gratuites aujourd'hui. Revenez demain ou contactez-nous sur WhatsApp pour accéder à la version Premium illimitée.`,
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

    const sujetsRef = loadSujets("bac", "philosophie");
    const sujetsContext =
      sujetsRef.length > 0
        ? `Voici des exemples de vrais sujets BAC Philosophie Cameroun pour t'inspirer :
${JSON.stringify(sujetsRef.slice(0, 2), null, 2)}`
        : "";

    const cacheKey = getCacheKey(text, "bac-a-philo", language);
    const cache = readCache();

    if (cache[cacheKey]) {
      return res.json(cache[cacheKey]);
    }

    const prompt = `
Tu es un professeur expérimenté de Philosophie au Cameroun, spécialiste du BAC Série A.
Tu connais parfaitement le programme officiel camerounais (MINSEC).
Si tu n'es pas certain d'une information, indique-le explicitement.
${langInstruction}

À partir du texte ci-dessous, réponds STRICTEMENT en JSON valide avec ce format EXACT :

{
  "resume": {
    "definition": "2-3 lignes de présentation du concept ou thème philosophique",
    "idees_principales": ["idée 1", "idée 2", "idée 3"],
    "auteurs_references": ["philosophe 1 et sa thèse", "philosophe 2 et sa thèse"],
    "procedes_litteraires": ["notion 1", "notion 2", "notion 3"],
    "conclusion": "2-3 lignes de synthèse philosophique"
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
    "consigne": "consigne officielle style BAC Série A Philosophie",
    "enonce": "Sujet de dissertation philosophique ou texte à commenter",
    "questions": [
      {"numero": 1, "question": "Question de définition d'un concept", "bareme": 2},
      {"numero": 2, "question": "Question d'analyse d'une thèse philosophique", "bareme": 4},
      {"numero": 3, "question": "Question de dissertation ou prise de position argumentée", "bareme": 6}
    ],
    "corrige": {
      "reponses": [
        {"numero": 1, "reponse": "Définition précise et rédigée"},
        {"numero": 2, "reponse": "Analyse détaillée avec références aux philosophes"},
        {"numero": 3, "reponse": "Plan détaillé : thèse, antithèse, synthèse avec arguments"}
      ],
      "bareme_total": 12
    }
  }
}

Règles:
- Écris en ${language === "en" ? "simple English adapted for Cameroonian students" : "français simple adapté aux élèves camerounais"}.
- QCM : exactement 5 questions, 4 options chacune.
- Flashcards : exactement 5.
- exercice_type_bac : 3 questions progressives (définition → analyse → dissertation).
- Toujours citer des philosophes réels avec leurs œuvres.
- Corrigé niveau BAC Série A Cameroun.
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
        error: e.message || "La réponse IA Philo n'est pas un JSON valide.",
        raw,
      });
    }

    return res.json(json);
  } catch (err) {
    console.error("❌ /generate-bac-a-philo error:", err);
    return res.status(500).json({ error: err.message || "Erreur serveur" });
  }
});

// ========= Route IA (BAC A - Histoire-Géographie) =========
app.post("/generate-bac-a-histoire-geo", async (req, res) => {
  try {
    const { text, language, anonymousId } = req.body;

    if (!checkLimit(anonymousId, "generate", LIMITE_GENERATE)) {
      return res.status(429).json({
        error: `Vous avez atteint votre limite de ${LIMITE_GENERATE} générations gratuites aujourd'hui. Revenez demain ou contactez-nous sur WhatsApp pour accéder à la version Premium illimitée.`,
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

    const sujetsRef = loadSujets("bac", "histoire-geo");
    const sujetsContext =
      sujetsRef.length > 0
        ? `Voici des exemples de vrais sujets BAC Histoire-Géo Cameroun pour t'inspirer :
${JSON.stringify(sujetsRef.slice(0, 2), null, 2)}`
        : "";

    const cacheKey = getCacheKey(text, "bac-a-histoire-geo", language);
    const cache = readCache();

    if (cache[cacheKey]) {
      return res.json(cache[cacheKey]);
    }

    const prompt = `
Tu es un professeur expérimenté d'Histoire-Géographie au Cameroun, spécialiste du BAC Série A.
Tu connais parfaitement le programme officiel camerounais (MINSEC).
Tu accordes une attention particulière à l'histoire africaine et camerounaise.
Si tu n'es pas certain d'une information, indique-le explicitement.
${langInstruction}

À partir du texte ci-dessous, réponds STRICTEMENT en JSON valide avec ce format EXACT :

{
  "resume": {
    "definition": "2-3 lignes de présentation du thème historique ou géographique",
    "idees_principales": ["idée 1", "idée 2", "idée 3"],
    "auteurs_references": ["acteur historique 1 et son rôle", "acteur 2 et son rôle"],
    "procedes_litteraires": ["date clé 1", "date clé 2", "concept géographique important"],
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
    "consigne": "consigne officielle style BAC Série A Histoire-Géo",
    "enonce": "Document historique, carte ou sujet de composition",
    "questions": [
      {"numero": 1, "question": "Question de localisation ou de définition", "bareme": 2},
      {"numero": 2, "question": "Question d'analyse d'un fait historique ou géographique", "bareme": 4},
      {"numero": 3, "question": "Question de composition ou commentaire de document", "bareme": 6}
    ],
    "corrige": {
      "reponses": [
        {"numero": 1, "reponse": "Réponse précise et rédigée"},
        {"numero": 2, "reponse": "Analyse détaillée avec dates et acteurs clés"},
        {"numero": 3, "reponse": "Plan détaillé : introduction, développement en 2-3 parties, conclusion"}
      ],
      "bareme_total": 12
    }
  }
}

Règles:
- Écris en ${language === "en" ? "simple English adapted for Cameroonian students" : "français simple adapté aux élèves camerounais"}.
- QCM : exactement 5 questions, 4 options chacune.
- Flashcards : exactement 5.
- exercice_type_bac : 3 questions progressives (localisation → analyse → composition).
- Toujours ancrer le contenu dans le contexte africain et camerounais quand pertinent.
- Corrigé niveau BAC Série A Cameroun.
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
        error:
          e.message || "La réponse IA Histoire-Géo n'est pas un JSON valide.",
        raw,
      });
    }

    return res.json(json);
  } catch (err) {
    console.error("❌ /generate-bac-a-histoire-geo error:", err);
    return res.status(500).json({ error: err.message || "Erreur serveur" });
  }
});

// ========= Route IA (BAC F4 - Technologie du Bâtiment) =========
app.post("/generate-f4-techno", async (req, res) => {
  try {
    const { text, language, anonymousId } = req.body;

    if (!checkLimit(anonymousId, "generate", LIMITE_GENERATE)) {
      return res.status(429).json({
        error: `Vous avez atteint votre limite de ${LIMITE_GENERATE} générations gratuites aujourd'hui. Revenez demain ou contactez-nous sur WhatsApp pour accéder à la version Premium illimitée.`,
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

    const sujetsRef = loadSujets("bac", "f4-techno");
    const sujetsContext =
      sujetsRef.length > 0
        ? `Voici des exemples de vrais sujets BAC F4 Technologie Cameroun :
${JSON.stringify(sujetsRef.slice(0, 2), null, 2)}`
        : "";

    const cacheKey = getCacheKey(text, "f4-techno", language);
    const cache = readCache();

    if (cache[cacheKey]) {
      return res.json(cache[cacheKey]);
    }

    const prompt = `
Tu es un professeur expérimenté de Technologie du Bâtiment au Cameroun, 
spécialiste du BAC Technique F4 Génie Civil (MINSEC).
Tu connais parfaitement le programme officiel camerounais.
Tu maîtrises les normes de construction en vigueur au Cameroun.
Si tu n'es pas certain d'une information, indique-le explicitement.
${langInstruction}

À partir du texte ci-dessous, réponds STRICTEMENT en JSON valide avec ce format EXACT :

{
  "resume": {
    "definition": "2-3 lignes de définition du thème technique",
    "principes_techniques": ["principe 1", "principe 2", "principe 3"],
    "schemas_construction": [
      {
        "titre": "Nom du schéma de construction",
        "instructions": "Ce que l'élève doit dessiner exactement",
        "elements_obligatoires": ["élément 1", "élément 2", "élément 3"],
        "cotation": "Dimensions importantes à indiquer"
      }
    ],
    "formules_cles": ["formule 1 avec unités", "formule 2 avec unités"],
    "materiaux_concernes": ["matériau 1", "matériau 2", "matériau 3"],
    "conclusion": "2-3 lignes de synthèse technique"
  },
  "points_cles": ["point 1", "point 2", "point 3"],
  "flashcards": [
    {"q": "question technique 1", "a": "réponse 1"},
    {"q": "question technique 2", "a": "réponse 2"}
  ],
  "qcm": [
    {
      "question": "question 1",
      "options": ["option A", "option B", "option C", "option D"],
      "bonne_reponse": "A",
      "explication": "explication technique 1"
    }
  ],
  "mots_cles": ["mot 1", "mot 2", "mot 3"],
  "exercice_type_bac": {
    "consigne": "consigne officielle style BAC F4 Cameroun",
    "enonce": "Énoncé technique avec contexte de chantier réaliste",
    "donnees": ["donnée numérique 1", "donnée numérique 2", "donnée 3"],
    "questions": [
      {"numero": 1, "question": "Question de connaissance technique", "bareme": 2},
      {"numero": 2, "question": "Question d'application avec calcul", "bareme": 4},
      {"numero": 3, "question": "Question de schéma ou dimensionnement", "bareme": 4}
    ],
    "corrige": {
      "reponses": [
        {"numero": 1, "reponse": "réponse technique détaillée 1"},
        {"numero": 2, "reponse": "solution avec calcul étape par étape 2"},
        {"numero": 3, "reponse": "schéma commenté ou dimensionnement détaillé 3"}
      ],
      "bareme_total": 10
    }
  }
}

Règles:
- Écris en ${language === "en" ? "simple English adapted for Cameroonian students" : "français simple adapté aux élèves camerounais"}.
- QCM : exactement 5 questions, 4 options chacune.
- Flashcards : exactement 5.
- exercice_type_bac : 3 questions progressives avec données numériques réalistes.
- Toujours inclure des schémas de construction annotés.
- Utiliser les normes et pratiques camerounaises du bâtiment.
- Solutions avec calculs détaillés étape par étape.
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
        error: e.message || "La réponse IA F4 Techno n'est pas un JSON valide.",
        raw,
      });
    }

    return res.json(json);
  } catch (err) {
    console.error("❌ /generate-f4-techno error:", err);
    return res.status(500).json({ error: err.message || "Erreur serveur" });
  }
});

// ========= Route IA (BAC F4 - Mathématiques) =========
app.post("/generate-f4-maths", async (req, res) => {
  try {
    const { text, language, anonymousId } = req.body;

    if (!checkLimit(anonymousId, "generate", LIMITE_GENERATE)) {
      return res.status(429).json({
        error: `Vous avez atteint votre limite de ${LIMITE_GENERATE} générations gratuites aujourd'hui. Revenez demain ou contactez-nous sur WhatsApp pour accéder à la version Premium illimitée.`,
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

    const sujetsRef = loadSujets("bac", "f4-maths");
    const sujetsContext =
      sujetsRef.length > 0
        ? `Voici des exemples de vrais sujets BAC F4 Maths Cameroun :
${JSON.stringify(sujetsRef.slice(0, 2), null, 2)}`
        : "";

    const cacheKey = getCacheKey(text, "f4-maths", language);
    const cache = readCache();

    if (cache[cacheKey]) {
      return res.json(cache[cacheKey]);
    }

    const prompt = `
Tu es un professeur expérimenté de Mathématiques au Cameroun,
spécialiste du BAC Technique F4 Génie Civil (MINSEC).
Tu connais parfaitement le programme officiel camerounais de Maths BAC F4.
Tu relies toujours les concepts mathématiques aux applications concrètes du bâtiment.
Si tu n'es pas certain d'une information, indique-le explicitement.
${langInstruction}

À partir du texte ci-dessous, réponds STRICTEMENT en JSON valide avec ce format EXACT :

{
  "resume": {
    "definition": "2-3 lignes de définition du concept mathématique",
    "principes_techniques": ["propriété 1", "propriété 2", "propriété 3"],
    "schemas_construction": [
      {
        "titre": "Nom du graphique ou schéma mathématique",
        "instructions": "Ce que l'élève doit construire exactement",
        "elements_obligatoires": ["élément 1", "élément 2", "élément 3"],
        "cotation": "Valeurs ou dimensions importantes à indiquer"
      }
    ],
    "formules_cles": ["formule 1 avec unités", "formule 2 avec unités"],
    "materiaux_concernes": ["application bâtiment 1", "application bâtiment 2"],
    "conclusion": "2-3 lignes de synthèse avec application au bâtiment"
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
    "consigne": "consigne officielle style BAC F4 Maths Cameroun",
    "enonce": "Énoncé mathématique avec contexte bâtiment réaliste",
    "donnees": ["donnée numérique 1", "donnée numérique 2", "donnée 3"],
    "questions": [
      {"numero": 1, "question": "Question de connaissance mathématique", "bareme": 2},
      {"numero": 2, "question": "Question d'application numérique", "bareme": 4},
      {"numero": 3, "question": "Question de résolution complète liée au bâtiment", "bareme": 4}
    ],
    "corrige": {
      "reponses": [
        {"numero": 1, "reponse": "solution détaillée étape par étape 1"},
        {"numero": 2, "reponse": "solution détaillée étape par étape 2"},
        {"numero": 3, "reponse": "solution complète avec application bâtiment 3"}
      ],
      "bareme_total": 10
    }
  }
}

Règles:
- Écris en ${language === "en" ? "simple English adapted for Cameroonian students" : "français simple adapté aux élèves camerounais"}.
- QCM : exactement 5 questions, 4 options chacune.
- Flashcards : exactement 5.
- exercice_type_bac : 3 questions progressives avec calculs numériques.
- Toujours relier les concepts mathématiques aux applications concrètes du bâtiment.
- Solutions détaillées étape par étape avec formules.
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
        error: e.message || "La réponse IA F4 Maths n'est pas un JSON valide.",
        raw,
      });
    }

    return res.json(json);
  } catch (err) {
    console.error("❌ /generate-f4-maths error:", err);
    return res.status(500).json({ error: err.message || "Erreur serveur" });
  }
});

// ========= Route IA (BAC F4 - Dessin Technique) =========
app.post("/generate-f4-dessin", async (req, res) => {
  try {
    const { text, language, anonymousId } = req.body;

    if (!checkLimit(anonymousId, "generate", LIMITE_GENERATE)) {
      return res.status(429).json({
        error: `Vous avez atteint votre limite de ${LIMITE_GENERATE} générations gratuites aujourd'hui. Revenez demain ou contactez-nous sur WhatsApp pour accéder à la version Premium illimitée.`,
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

    const sujetsRef = loadSujets("bac", "f4-dessin");
    const sujetsContext =
      sujetsRef.length > 0
        ? `Voici des exemples de vrais sujets BAC F4 Dessin Technique Cameroun :
${JSON.stringify(sujetsRef.slice(0, 2), null, 2)}`
        : "";

    const cacheKey = getCacheKey(text, "f4-dessin", language);
    const cache = readCache();

    if (cache[cacheKey]) {
      return res.json(cache[cacheKey]);
    }

    const prompt = `
Tu es un professeur expérimenté de Dessin Technique au Cameroun,
spécialiste du BAC Technique F4 Génie Civil (MINSEC).
Tu maîtrises parfaitement les normes ISO de dessin technique
et les conventions de représentation des bâtiments.
Si tu n'es pas certain d'une information, indique-le explicitement.
${langInstruction}

À partir du texte ci-dessous, réponds STRICTEMENT en JSON valide avec ce format EXACT :

{
  "resume": {
    "definition": "2-3 lignes de définition du concept de dessin technique",
    "principes_techniques": ["principe de représentation 1", "principe 2", "principe 3"],
    "schemas_construction": [
      {
        "titre": "Nom du dessin ou plan à réaliser",
        "instructions": "Ce que l'élève doit dessiner exactement avec les conventions",
        "elements_obligatoires": ["élément 1", "élément 2", "élément 3"],
        "cotation": "Types de cotation et dimensions à indiquer"
      }
    ],
    "formules_cles": ["règle de représentation 1", "règle 2"],
    "materiaux_concernes": ["type de plan 1", "type de plan 2"],
    "conclusion": "2-3 lignes de synthèse sur l'importance du dessin technique"
  },
  "points_cles": ["point 1", "point 2", "point 3"],
  "flashcards": [
    {"q": "question sur les conventions 1", "a": "réponse 1"},
    {"q": "question sur les normes 2", "a": "réponse 2"}
  ],
  "qcm": [
    {
      "question": "question 1",
      "options": ["option A", "option B", "option C", "option D"],
      "bonne_reponse": "A",
      "explication": "explication sur les normes ou conventions"
    }
  ],
  "mots_cles": ["mot 1", "mot 2", "mot 3"],
  "exercice_type_bac": {
    "consigne": "consigne officielle style BAC F4 Dessin Technique Cameroun",
    "enonce": "Énoncé avec description d'un élément de bâtiment à représenter",
    "donnees": ["échelle 1", "dimensions données 2", "vue demandée 3"],
    "questions": [
      {"numero": 1, "question": "Question sur les conventions ou normes", "bareme": 2},
      {"numero": 2, "question": "Question de lecture ou interprétation de plan", "bareme": 4},
      {"numero": 3, "question": "Question de réalisation d'un dessin ou coupe", "bareme": 6}
    ],
    "corrige": {
      "reponses": [
        {"numero": 1, "reponse": "réponse détaillée sur les conventions"},
        {"numero": 2, "reponse": "interprétation détaillée du plan avec éléments identifiés"},
        {"numero": 3, "reponse": "description étape par étape de la réalisation du dessin"}
      ],
      "bareme_total": 12
    }
  }
}

Règles:
- Écris en ${language === "en" ? "simple English adapted for Cameroonian students" : "français simple adapté aux élèves camerounais"}.
- QCM : exactement 5 questions, 4 options chacune.
- Flashcards : exactement 5.
- exercice_type_bac : 3 questions progressives (conventions → lecture → réalisation).
- Toujours mentionner les normes ISO applicables.
- Décrire précisément les étapes de réalisation des dessins.
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
        error: e.message || "La réponse IA F4 Dessin n'est pas un JSON valide.",
        raw,
      });
    }

    return res.json(json);
  } catch (err) {
    console.error("❌ /generate-f4-dessin error:", err);
    return res.status(500).json({ error: err.message || "Erreur serveur" });
  }
});

// ========= Route IA (BAC F4 - Physique Appliquée) =========
app.post("/generate-f4-physique", async (req, res) => {
  try {
    const { text, language, anonymousId } = req.body;

    if (!checkLimit(anonymousId, "generate", LIMITE_GENERATE)) {
      return res.status(429).json({
        error: `Vous avez atteint votre limite de ${LIMITE_GENERATE} générations gratuites aujourd'hui. Revenez demain ou contactez-nous sur WhatsApp pour accéder à la version Premium illimitée.`,
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

    const sujetsRef = loadSujets("bac", "f4-physique");
    const sujetsContext =
      sujetsRef.length > 0
        ? `Voici des exemples de vrais sujets BAC F4 Physique Cameroun :
${JSON.stringify(sujetsRef.slice(0, 2), null, 2)}`
        : "";

    const cacheKey = getCacheKey(text, "f4-physique", language);
    const cache = readCache();

    if (cache[cacheKey]) {
      return res.json(cache[cacheKey]);
    }

    const prompt = `
Tu es un professeur expérimenté de Physique Appliquée au Cameroun,
spécialiste du BAC Technique F4 Génie Civil (MINSEC).
Tu relies toujours les concepts physiques aux applications 
concrètes du bâtiment et du génie civil.
Tu maîtrises la mécanique, l'hydraulique, la thermique 
et l'électricité appliquées à la construction.
Si tu n'es pas certain d'une information, indique-le explicitement.
${langInstruction}

À partir du texte ci-dessous, réponds STRICTEMENT en JSON valide avec ce format EXACT :

{
  "resume": {
    "definition": "2-3 lignes de définition du concept physique",
    "principes_techniques": ["loi physique 1", "loi physique 2", "principe 3"],
    "schemas_construction": [
      {
        "titre": "Nom du schéma physique ou technique",
        "instructions": "Ce que l'élève doit schématiser exactement",
        "elements_obligatoires": ["élément 1", "élément 2", "élément 3"],
        "cotation": "Grandeurs physiques et unités à indiquer"
      }
    ],
    "formules_cles": ["formule 1 avec unités SI", "formule 2 avec unités SI"],
    "materiaux_concernes": ["application bâtiment 1", "application bâtiment 2"],
    "conclusion": "2-3 lignes de synthèse avec application au génie civil"
  },
  "points_cles": ["point 1", "point 2", "point 3"],
  "flashcards": [
    {"q": "question physique 1", "a": "réponse avec unités 1"},
    {"q": "question physique 2", "a": "réponse avec unités 2"}
  ],
  "qcm": [
    {
      "question": "question 1",
      "options": ["option A", "option B", "option C", "option D"],
      "bonne_reponse": "A",
      "explication": "explication physique avec application bâtiment"
    }
  ],
  "mots_cles": ["mot 1", "mot 2", "mot 3"],
  "exercice_type_bac": {
    "consigne": "consigne officielle style BAC F4 Physique Cameroun",
    "enonce": "Énoncé physique avec contexte de chantier ou bâtiment réaliste",
    "donnees": ["donnée physique 1 avec unité", "donnée 2 avec unité", "donnée 3"],
    "questions": [
      {"numero": 1, "question": "Question de connaissance ou définition", "bareme": 2},
      {"numero": 2, "question": "Question d'application numérique avec formule", "bareme": 4},
      {"numero": 3, "question": "Question de résolution complète liée au bâtiment", "bareme": 4}
    ],
    "corrige": {
      "reponses": [
        {"numero": 1, "reponse": "réponse précise avec définition et unités"},
        {"numero": 2, "reponse": "solution étape par étape avec formules et unités"},
        {"numero": 3, "reponse": "résolution complète avec application génie civil"}
      ],
      "bareme_total": 10
    }
  }
}

Règles:
- Écris en ${language === "en" ? "simple English adapted for Cameroonian students" : "français simple adapté aux élèves camerounais"}.
- QCM : exactement 5 questions, 4 options chacune.
- Flashcards : exactement 5.
- exercice_type_bac : 3 questions progressives avec calculs numériques.
- Toujours utiliser les unités SI.
- Relier chaque concept physique à une application concrète du bâtiment.
- Solutions détaillées étape par étape avec formules.
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
        error:
          e.message || "La réponse IA F4 Physique n'est pas un JSON valide.",
        raw,
      });
    }

    return res.json(json);
  } catch (err) {
    console.error("❌ /generate-f4-physique error:", err);
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

// ====== Route Feedback ======
app.post("/feedback", async (req, res) => {
  try {
    const { anonymousId, note, commentaire, matiere, chapitre } = req.body;
    
    // Log dans la console (visible dans Render logs)
    console.log(`📊 FEEDBACK | ID: ${anonymousId} | Note: ${note}/5 | Matière: ${matiere} | Chapitre: ${chapitre} | Commentaire: ${commentaire}`);
    
    // Option : sauvegarder dans un fichier JSON local
    // const fs = require('fs');
    // const feedbacks = JSON.parse(fs.readFileSync('./feedbacks.json', 'utf8') || '[]');
    // feedbacks.push({ anonymousId, note, commentaire, matiere, chapitre, date: new Date().toISOString() });
    // fs.writeFileSync('./feedbacks.json', JSON.stringify(feedbacks, null, 2));
    
    res.json({ success: true });
  } catch (err) {
    console.error("Erreur feedback:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});