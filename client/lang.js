const translations = {
  fr: {
    titre: "Prepa Baccalauréat & Concours Nationaux 🇨🇲",
    aide: "💡 Comment utiliser PrepConcours AI ? 1️⃣ Choisis ta catégorie, série et matière. 2️⃣ Sélectionne un chapitre dans la liste ou colle ton cours. 3️⃣ Clique sur Générer et reçois ta fiche en 30 secondes ! 🚀",

    mode: "Mode",
    langue: "Langue",
    placeholder: "Colle ton chapitre ici...",
    generer: "Générer",
    disclaimer:
      "⚠️ Contenu généré par IA à titre indicatif. Consultez votre enseignant pour validation.",
    resume: "Résumé",
    points: "Points clés",
    flashcards: "Flashcards",
    qcm: "QCM",
    corriger: "Corriger",
    motscles: "Mots-clés",
    plan: "Plan de révision (7 jours) — ENS",
    pieges: "Pièges fréquents — ENS",
    questions: "Questions longues type ENS",
    bareme: "Mini-barème ENS (simulation 20 pts)",
    exercice: "Exercice type ENS + Corrigé",
    pdf: "📄 Télécharger le PDF ENS",
    chargement: "⏳ Génération IA en cours...",
    termine: "✅ Terminé",
  },
  en: {
    titre: "Prepa GCE Advenced Level  & National Contest 🇨🇲",
    aide: "💡 Comment utiliser PrepConcours AI ? 1️⃣ Choisis ta catégorie, série et matière. 2️⃣ Sélectionne un chapitre dans la liste ou colle ton cours. 3️⃣ Clique sur Générer et reçois ta fiche en 30 secondes ! 🚀",
    mode: "Mode",
    langue: "Language",
    placeholder: "Paste your chapter here...",
    generer: "Generate",
    disclaimer:
      "⚠️ AI-generated content for guidance only. Please verify with your teacher.",
    resume: "Summary",
    points: "Key Points",
    flashcards: "Flashcards",
    qcm: "MCQ",
    corriger: "Correct",
    motscles: "Keywords",
    plan: "7-Day Study Plan — ENS",
    pieges: "Common Mistakes — ENS",
    questions: "ENS Long Questions",
    bareme: "ENS Mini Grade (simulation 20 pts)",
    exercice: "ENS Exercise + Solution",
    pdf: "📄 Download ENS PDF",
    chargement: "⏳ AI Generation in progress...",
    termine: "✅ Done",
  },
};

function applyLanguage(lang) {
  const t = translations[lang] || translations["fr"];

  const h1 = document.querySelector("h1");
  if (h1) h1.textContent = t.titre;

  const soustitre = document.querySelector("main.container > p");
  if (aide) aide.textContent = t.aide;

  const disclaimer = document.querySelector(".disclaimer");
  if (disclaimer) disclaimer.textContent = t.disclaimer;

  const btnGenerate = document.getElementById("btnTest");
  if (btnGenerate) btnGenerate.textContent = t.generer;

  const btnCorriger = document.getElementById("btnCorriger");
  if (btnCorriger) btnCorriger.textContent = t.corriger;

  const btnDownloadPdf = document.getElementById("btnDownloadPdf");
  if (btnDownloadPdf) btnDownloadPdf.textContent = t.pdf;

  const inputText = document.getElementById("inputText");
  if (inputText) inputText.placeholder = t.placeholder;

  const cards = document.querySelectorAll(".card h2");
  if (cards[0]) cards[0].textContent = t.resume;
  if (cards[1]) cards[1].textContent = t.points;

  const planH2 = document.querySelector("#ensPlanSection h2");
  if (planH2) planH2.textContent = t.plan;

  const piegesH2 = document.querySelector("#ensPiegesSection h2");
  if (piegesH2) piegesH2.textContent = t.pieges;

  const longH2 = document.querySelector("#ensLongSection h2");
  if (longH2) longH2.textContent = t.questions;

  const baremeH2 = document.querySelector("#ensBaremeSection h2");
  if (baremeH2) baremeH2.textContent = t.bareme;

  const exerciceH2 = document.querySelector("#ensExerciceSection h2");
  if (exerciceH2) exerciceH2.textContent = t.exercice;

  // Chapitre select
  const chapitreLabel = document.querySelector(".chapitre-label");
  if (chapitreLabel)
    chapitreLabel.textContent =
      lang === "en" ? "Choose a chapter" : "Choisis un chapitre";

  // Textarea placeholder
  if (inputText)
    inputText.placeholder =
      lang === "en"
        ? "Paste your course here... (min 3 characters)"
        : "Colle ici ton chapitre de cours... (min 3 caractères)";

  // Séparateur OU
  const ouSep = document.querySelector(".ou-separateur span");
  if (ouSep) ouSep.textContent = lang === "en" ? "OR" : "OU";

  // Label texte libre
  const texteLibreLabel = document.querySelector(
    ".texte-libre .chapitre-label",
  );
  if (texteLibreLabel)
    texteLibreLabel.textContent =
      lang === "en"
        ? "Or paste your course below"
        : "Colle ton cours ci-dessous";
}

// Applique au chargement de la page
document.addEventListener("DOMContentLoaded", () => {
  const langEl = document.getElementById("lang");
  if (langEl) {
    applyLanguage(langEl.value);
    langEl.addEventListener("change", () => {
      applyLanguage(langEl.value);
    });
  }
});
