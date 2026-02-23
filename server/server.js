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

// ========= Routes =========

// Test route
app.get("/", (req, res) => {
  res.send("OK ✅ Serveur SVT Prep en ligne");
});

// ========= Route IA (BAC D) =====================
app.post("/generate", async (req, res) => {
  try {
    const { text, language, anonymousId } = req.body;

    if (!checkLimit(anonymousId, "generate", 8)) {
      return res.status(429).json({ error: "Limite atteinte aujourd'hui." });
    }

    if (!requireApiKey(res)) return;

    if (!text || String(text).trim().length < 50) {
      return res
        .status(400)
        .json({ error: "Colle au moins 50 caractères de cours SVT." });
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
  "conclusion": "2-3 lignes de synthèse"
},
  "points_cles": ["..."],
  "flashcards": [{"q":"...", "a":"..."}],
  "qcm": [{"question":"...", "options":["A","B","C","D"], "bonne_reponse":"A", "explication":"..."}],
  "mots_cles": ["..."]
}

Règles:
- Écris en ${language === "en" ? "simple English adapted for Cameroonian students" : "français simple adapté aux élèves camerounais"}.
- QCM: exactement 5 questions, 4 options chacune.
- Flashcards: exactement 5.
- Reste fidèle au texte fourni, ne invente pas de contenu hors du texte.
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
      console.log("✅ Réponse depuis le cache !");
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
    console.error("❌ /generate error:", err);
    return res.status(500).json({ error: err.message || "Erreur serveur" });
  }
});

// Route IA ENS
app.post("/generate-ens", async (req, res) => {
  try {
    const { text, language, anonymousId } = req.body;

    if (!checkLimit(anonymousId, "generate", 8)) {
      return res.status(429).json({ error: "Limite atteinte aujourd'hui." });
    }

    if (!requireApiKey(res)) return;

    if (!text || String(text).trim().length < 80) {
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
  "definition": "2-5 lignes de définition du thème",
  "mecanismes": ["mécanisme 1", "mécanisme 2", "mécanisme 3"],
  "schemas_importants": [
  {
    "titre": "Nom du schéma",
    "instructions": "Ce que l'élève doit dessiner exactement",
    "elements_obligatoires": ["élément 1", "élément 2", "élément 3"]
  }
    "conclusion": "2-5 lignes de synthèse"
],
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
- exercice_type: 1 exercice + corrigé fidèle au texte fourni.
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
      console.log("✅ Réponse ENS depuis le cache !");
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
    const { anonymousId } = req.body;

    if (!checkLimit(anonymousId, "pdf", 3)) {
      return res
        .status(429)
        .json({ error: "Limite PDF atteinte aujourd'hui." });
    }

    const data = req.body;

    if (!data || typeof data !== "object") {
      return res.status(400).json({ error: "Body JSON ENS manquant." });
    }

    // Headers de téléchargement
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="ENS_Biologie_Plan.pdf"',
    );

    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(res);

    // Helpers PDF
    const safe = (v) => (v == null ? "" : String(v));
    const addTitle = (t) =>
      doc.fontSize(18).text(t, { underline: true }).moveDown(0.6);
    const addH2 = (t) => doc.fontSize(13).text(t).moveDown(0.3);
    const addPara = (t) => doc.fontSize(11).text(t).moveDown(0.6);
    const addBullets = (items) => {
      (items || []).forEach((x) => doc.fontSize(11).text(`• ${safe(x)}`));
      doc.moveDown(0.6);
    };

    // Contenu PDF
    addTitle("ENS Yaounde (2nd cycle) — Biologie/SVT");
    addPara(`Généré le : ${new Date().toLocaleString("fr-FR")}`);

    addH2("Résumé orienté ENS");
    addPara(safe(data.resume_oriente_ens || data.resume));

    addH2("Notions à maîtriser");
    addBullets(data.notions_a_maitriser || data.points_cles);

    addH2("Plan de révision (7 jours)");
    (data.plan_revision_7j || []).forEach((d) => {
      doc.fontSize(11).text(`Jour ${safe(d.jour)} — ${safe(d.objectif)}`);
      (d.taches || []).forEach((t) => doc.fontSize(11).text(`   - ${safe(t)}`));
      doc.moveDown(0.4);
    });
    doc.moveDown(0.4);

    addH2("Pièges fréquents");
    addBullets(data.pieges_frequents);

    addH2("Questions longues type ENS");
    (data.questions_type_ens || []).forEach((q, i) => {
      doc
        .fontSize(11)
        .text(`${i + 1}) ${safe(q.question)}`)
        .moveDown(0.2);

      doc.fontSize(11).text("Attendus :");
      (q.attendus || []).forEach((a) =>
        doc.fontSize(11).text(`   • ${safe(a)}`),
      );

      doc.moveDown(0.2);
      doc.fontSize(11).text("Plan de réponse :");
      (q.plan_reponse || []).forEach((p) =>
        doc.fontSize(11).text(`   - ${safe(p)}`),
      );

      doc.moveDown(0.6);
    });

    addH2("Mini-barème (simulation /20)");
    (data.mini_bareme || []).forEach((b) => {
      doc.fontSize(11).text(`• ${safe(b.element)} — ${safe(b.points)} pts`);
    });
    doc.moveDown(0.6);

    doc
      .fontSize(10)
      .text("Bon courage pour le concours !", { align: "center" });
    doc.end();
  } catch (err) {
    console.error("❌ /export-ens-pdf error:", err);
    return res.status(500).json({ error: err.message || "Erreur PDF" });
  }
});

// 404 fallback (pratique)
app.use((req, res) => {
  res.status(404).json({ error: "Route introuvable" });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Serveur démarré : http://localhost:${PORT}`);
});

//console.log("Usage:", usageStore);
