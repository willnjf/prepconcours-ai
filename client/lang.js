const translations = {
  fr: {
    titre: "SVT Prep BAC D 🇨🇲",
    soustitre: "Colle un chapitre de SVT, puis clique sur Générer.",
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
    titre: "SVT Prep BAC D 🇨🇲",
    soustitre: "Paste a SVT chapter, then click Generate.",
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
  if (soustitre) soustitre.textContent = t.soustitre;

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

  console.log("✅ Langue appliquée :", lang);
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
