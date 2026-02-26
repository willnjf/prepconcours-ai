// ====== Éléments UI ======
let lastBacData = null;
let lastEnsData = null;

const inputText = document.getElementById("inputText");
const btnGenerate = document.getElementById("btnTest");

const modeEl = document.getElementById("mode");
const langEl = document.getElementById("lang");

const resumeEl = document.getElementById("resume");
const pointsEl = document.getElementById("pointsCles");
const flashcardsEl = document.getElementById("flashcards");
const qcmEl = document.getElementById("qcm");
const motsClesEl = document.getElementById("motsCles");
const statusEl = document.getElementById("status");

const btnCorriger = document.getElementById("btnCorriger");
const scoreEl = document.getElementById("score");

const ensPlanSection = document.getElementById("ensPlanSection");
const ensPlanEl = document.getElementById("ensPlan");

const ensPiegesSection = document.getElementById("ensPiegesSection");
const ensPiegesEl = document.getElementById("ensPieges");

const ensLongSection = document.getElementById("ensLongSection");
const ensLongEl = document.getElementById("ensLong");

const ensBaremeSection = document.getElementById("ensBaremeSection");
const ensBaremeEl = document.getElementById("ensBareme");

const ensExerciceSection = document.getElementById("ensExerciceSection");
const ensExerciceEl = document.getElementById("ensExercice");

const btnDownloadPdf = document.getElementById("btnDownloadPdf");
const badgeBac = document.getElementById("badgeBac");
const badgeEns = document.getElementById("badgeEns");
const btnDownloadBacPdf = document.getElementById("btnDownloadBacPdf");
const bacExerciceSection = document.getElementById("bacExerciceSection");
const bacExerciceEl = document.getElementById("bacExercice");

// ← Ajoute ces deux lignes ici
const selectChapitre = document.getElementById("selectChapitre");
const chapitreSelectBox = document.getElementById("chapitreSelectBox");

// === Scroll animé ===
function smoothScrollTo(element, duration = 800) {
  const targetY = element.getBoundingClientRect().top + window.scrollY - 80;
  const startY = window.scrollY;
  const diff = targetY - startY;
  let start = null;

  function step(timestamp) {
    if (!start) start = timestamp;
    const progress = Math.min((timestamp - start) / duration, 1);
    const ease =
      progress < 0.5
        ? 2 * progress * progress
        : -1 + (4 - 2 * progress) * progress;
    window.scrollTo(0, startY + diff * ease);
    if (progress < 1) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}

// ====== Structure du menu ======
const MENU = {
  "bac-general": {
    label: "BAC Général",
    series: {
      "bac-d": {
        label: "Série D",
        matieres: {
          "bac-svt": { label: "SVT", actif: true },
          "bac-maths": { label: "Mathématiques", actif: true },
          "bac-pc": { label: "Physique - Chimie", actif: true },
        },
      },
      "bac-c": {
        label: "Série C",
        matieres: {
          "bac-c-maths": { label: "Mathématiques", actif: false },
          "bac-c-pc": { label: "Physique-Chimie", actif: false },
          "bac-c-svt": { label: "SVT", actif: false },
        },
      },
      "bac-a": {
        label: "Série A",
        matieres: {
          "bac-a-français": { label: "Français", actif: false },
          "bac-a-philo": { label: "Philosophie", actif: false },
          "bac-a-histgeo": { label: "Histoire-Géographie", actif: false },
        },
      },
    },
  },
  gce: {
    label: "GCE Anglophone",
    series: {
      "gce-science": {
        label: "A/L Science",
        matieres: {
          "gce-maths": { label: "Mathematics", actif: false },
          "gce-physics": { label: "Physics", actif: false },
          "gce-chemistry": { label: "Chemistry", actif: false },
          "gce-biology": { label: "Biology", actif: false },
        },
      },
      "gce-arts": {
        label: "A/L Arts",
        matieres: {
          "gce-literature": { label: "Literature in English", actif: false },
          "gce-history": { label: "History", actif: false },
          "gce-government": { label: "Government", actif: false },
          "gce-gp": { label: "General Paper", actif: false },
        },
      },
      "gce-commercial": {
        label: "A/L Commercial",
        matieres: {
          "gce-economics": { label: "Economics", actif: false },
          "gce-accounting": { label: "Accounting", actif: false },
          "gce-commerce": { label: "Commerce", actif: false },
        },
      },
    },
  },
  "bac-technique": {
    label: "BAC Technique",
    series: {
      "bac-f1": {
        label: "F1 - Construction Mécanique",
        matieres: {
          "f1-maths": { label: "Mathématiques", actif: false },
          "f1-sciences": { label: "Sciences Physiques", actif: false },
          "f1-techno": { label: "Technologie Mécanique", actif: false },
          "f1-dessin": { label: "Dessin Industriel", actif: false },
        },
      },
      "bac-f2": {
        label: "F2 - Électronique",
        matieres: {
          "f2-maths": { label: "Mathématiques", actif: false },
          "f2-physique": { label: "Physique Appliquée", actif: false },
          "f2-electronique": { label: "Électronique", actif: false },
        },
      },
      "bac-f3": {
        label: "F3 - Électrotechnique",
        matieres: {
          "f3-maths": { label: "Mathématiques", actif: false },
          "f3-physique": { label: "Physique Appliquée", actif: false },
          "f3-electro": { label: "Électrotechnique", actif: false },
        },
      },
      "bac-f4": {
        label: "F4 - Génie Civil",
        matieres: {
          "f4-maths": { label: "Mathématiques", actif: false },
          "f4-physique": { label: "Physique", actif: false },
          "f4-techno": { label: "Technologie du Bâtiment", actif: false },
          "f4-dessin": { label: "Dessin Technique", actif: false },
        },
      },
      "bac-f5": {
        label: "F5 - Froid & Climatisation",
        matieres: {
          "f5-maths": { label: "Mathématiques", actif: false },
          "f5-sciences": { label: "Sciences Physiques", actif: false },
          "f5-techno": { label: "Techno Froid/Climatisation", actif: false },
        },
      },
      "bac-g1": {
        label: "G1 - Techniques Administratives",
        matieres: {
          "g1-economie": { label: "Économie", actif: false },
          "g1-droit": { label: "Droit", actif: false },
          "g1-compta": { label: "Comptabilité", actif: false },
        },
      },
      "bac-g2": {
        label: "G2 - Comptabilité/Gestion",
        matieres: {
          "g2-compta": { label: "Comptabilité", actif: false },
          "g2-economie": { label: "Économie", actif: false },
          "g2-maths": { label: "Mathématiques", actif: false },
        },
      },
      "bac-g3": {
        label: "G3 - Commerce",
        matieres: {
          "g3-commerce": { label: "Techniques Commerciales", actif: false },
          "g3-economie": { label: "Économie", actif: false },
          "g3-compta": { label: "Comptabilité", actif: false },
        },
      },
    },
  },
  concours: {
    label: "Concours Nationaux",
    series: {
      ens: {
        label: "ENS Yaoundé",
        matieres: {
          "ens-svt": { label: "Biologie/SVT", actif: true },
          "ens-maths": { label: "Mathématiques", actif: false },
          "ens-physique": { label: "Physique", actif: false },
        },
      },
      enset: {
        label: "ENSET",
        matieres: {
          "enset-maths": { label: "Mathématiques", actif: false },
          "enset-physique": { label: "Physique", actif: false },
          "enset-info": { label: "Informatique", actif: false },
        },
      },
      polytech: {
        label: "Polytechnique",
        matieres: {
          "poly-maths": { label: "Mathématiques", actif: false },
          "poly-pc": { label: "Physique-Chimie", actif: false },
        },
      },
      enam: {
        label: "ENAM",
        matieres: {
          "enam-culture": { label: "Culture Générale", actif: false },
          "enam-droit": { label: "Droit", actif: false },
          "enam-economie": { label: "Économie", actif: false },
        },
      },
      esstic: {
        label: "ESSTIC",
        matieres: {
          "esstic-culture": { label: "Culture Générale", actif: false },
          "esstic-français": { label: "Français", actif: false },
          "esstic-com": { label: "Communication", actif: false },
        },
      },
      fmsb: {
        label: "FMSB (Médecine)",
        matieres: {
          "fmsb-svt": { label: "SVT", actif: false },
          "fmsb-pc": { label: "Physique-Chimie", actif: false },
          "fmsb-maths": { label: "Mathématiques", actif: false },
        },
      },
      iai: {
        label: "IAI Cameroun",
        matieres: {
          "iai-info": { label: "Informatique", actif: false },
          "iai-maths": { label: "Mathématiques", actif: false },
        },
      },
    },
  },
};

// ====== Chapitres prédéfinis ======
const CHAPITRES = {
  "bac-svt": [
    "🧬 1 BIOLOGIE CELLULAIRE",
    "◆ Structure et fonctionnement de la cellule",
    "La cellule et ses organites",
    "La mitose",
    "La méiose",
    "◆ Métabolisme cellulaire",
    "La photosynthèse",
    "La respiration cellulaire",

    "🧪 2 GÉNÉTIQUE & HÉRÉDITÉ",
    "◆ Génétique mendélienne",
    "La génétique mendélienne",
    "La transmission de l'information génétique",
    "◆ Génétique moléculaire",
    "L'ADN et la réplication",
    "La synthèse des protéines",

    "🧠 3 BIOLOGIE HUMAINE / PHYSIOLOGIE",
    "◆ Fonction de nutrition",
    "La digestion",
    "La circulation sanguine",
    "◆ Coordination et régulation",
    "Le système nerveux",
    "L'immunologie",
    "◆ Fonction de reproduction",
    "La reproduction",

    "🌿 4 BIOLOGIE VÉGÉTALE",
    "◆ Nutrition des plantes",
    "La nutrition minérale des plantes",
    "La photosynthèse chez les végétaux",
    "◆ Reproduction végétale",
    "La reproduction chez les végétaux",

    "🌍 5 GÉOLOGIE",
    "◆ Géologie interne",
    "La tectonique des plaques",
    "Les roches et minéraux",
    "◆ Géologie externe",
    "L'érosion et les sédiments",
    "◆ Evolution",
    "L'évolution des espèces",
    "L'écologie et les écosystèmes",
  ],

  "bac-maths": [
    "📐1 ANALYSE",
    "◆ Fonctions",
    "Les fonctions dérivées",
    "Les fonctions usuelles",
    "Les limites de fonctions",
    "La continuité des fonctions",
    "◆ Intégration",
    "Les intégrales",
    "Les équations différentielles",
    "◆ Suites",
    "Les suites numériques",
    "Les suites arithmétiques et géométriques",

    "📊 2 PROBABILITÉS & STATISTIQUES",
    "◆ Probabilités",
    "Les probabilités",
    "Les variables aléatoires",
    "La loi binomiale",
    "La loi normale",
    "◆ Statistiques",
    "Les statistiques descriptives",
    "Les statistiques inférentielles",

    "📏 3 GÉOMÉTRIE",
    "◆ Géométrie plane",
    "La géométrie plane",
    "Les transformations géométriques",
    "◆ Géométrie dans l'espace",
    "La géométrie dans l'espace",
    "Les vecteurs dans l'espace",

    "🔢 4 ALGÈBRE",
    "◆ Nombres",
    "Les nombres complexes",
    "Les matrices",
    "◆ Trigonométrie",
    "La trigonométrie",
    "Les équations trigonométriques",
    "◆ Arithmétique",
    "L'arithmétique et la divisibilité",
    "Les systèmes d'équations",
  ],

  "bac-pc": [
    "⚡ 1 PHYSIQUE MÉCANIQUE",
    "◆ Cinématique",
    "Le mouvement et la cinématique",
    "La chute libre",
    "◆ Dynamique",
    "La mécanique : les forces",
    "Les lois de Newton",
    "La gravitation universelle",
    "◆ Énergie",
    "L'énergie et ses formes",
    "Le travail et la puissance",
    "La conservation de l'énergie",

    "🔌 2 PHYSIQUE ÉLECTRICITÉ",
    "◆ Électrostatique",
    "L'électricité : courant et tension",
    "La loi d'Ohm",
    "◆ Circuits électriques",
    "Les circuits électriques",
    "La résistance et loi d'Ohm",
    "Les condensateurs",
    "◆ Électromagnétisme",
    "Le magnétisme",
    "L'induction électromagnétique",

    "🌊 3 PHYSIQUE ONDES & OPTIQUE",
    "◆ Optique",
    "L'optique géométrique",
    "Les lentilles et miroirs",
    "◆ Ondes",
    "Les ondes mécaniques",
    "Les ondes sonores",
    "La lumière et les ondes électromagnétiques",

    "⚗️ 4 CHIMIE GÉNÉRALE",
    "◆ Structure de la matière",
    "La structure de la matière",
    "La classification périodique",
    "Les liaisons chimiques",
    "◆ Réactions chimiques",
    "Les réactions chimiques",
    "La stœchiométrie",
    "La thermochimie",
    "◆ Radioactivité",
    "La radioactivité",
    "La fission et la fusion nucléaire",

    "🧪 5 CHIMIE EN SOLUTION",
    "◆ Acides et bases",
    "Les acides et les bases",
    "Le pH et les indicateurs",
    "◆ Oxydoréduction",
    "L'oxydoréduction",
    "Les piles électrochimiques",
    "◆ Solutions",
    "Les solutions aqueuses",
    "La solubilité",

    "🔬 6 CHIMIE ORGANIQUE",
    "◆ Hydrocarbures",
    "La chimie organique",
    "Les alcanes et alcènes",
    "◆ Fonctions organiques",
    "Les alcools et phénols",
    "Les acides carboxyliques",
    "Les esters et savons",
  ],

  "ens-svt": [
    "🧬 1 BIOLOGIE CELLULAIRE AVANCÉE",
    "◆ Division cellulaire",
    "La méiose et la diversité génétique",
    "La mitose et le cycle cellulaire",
    "◆ Métabolisme avancé",
    "La photosynthèse et la respiration",
    "La régulation du métabolisme",

    "🧪 2 GÉNÉTIQUE AVANCÉE",
    "◆ Génétique classique",
    "La génétique mendélienne avancée",
    "Les liaisons génétiques",
    "◆ Génétique moléculaire",
    "L'expression des gènes",
    "Les mutations et leurs conséquences",
    "La régulation de l'expression génique",

    "🧠 3 PHYSIOLOGIE AVANCÉE",
    "◆ Neurophysiologie",
    "La neurophysiologie",
    "La transmission synaptique",
    "◆ Immunologie avancée",
    "L'immunologie et les défenses",
    "Les réponses immunitaires spécifiques",
    "◆ Endocrinologie",
    "La régulation hormonale",

    "🌍 4 ÉCOLOGIE & ÉVOLUTION",
    "◆ Écologie",
    "L'écologie des populations",
    "Les cycles biogéochimiques",
    "◆ Evolution",
    "L'évolution et la sélection naturelle",
    "La phylogénèse et la classification",

    "🌿 5 BIOLOGIE VÉGÉTALE AVANCÉE",
    "◆ Physiologie végétale",
    "La nutrition minérale avancée",
    "La régulation de la croissance",
    "◆ Reproduction végétale avancée",
    "La reproduction sexuée chez les plantes",

    "🌊 6 GÉOLOGIE AVANCÉE",
    "◆ Géodynamique",
    "La tectonique des plaques",
    "La formation des chaînes de montagnes",
    "◆ Pétrologie",
    "Les roches magmatiques et métamorphiques",
    "Le cycle des roches",
  ],
};

// ====== Logique du menu ======
let currentCat = "bac-general";
let currentSerie = "bac-d";
let currentMatiere = "bac-svt";

const selectSerie = document.getElementById("selectSerie");
const selectMatiere = document.getElementById("selectMatiere");
const catBtns = document.querySelectorAll(".cat-btn");

function updateSeries(cat) {
  selectSerie.innerHTML = '<option value="">-- Choisir --</option>';
  const series = MENU[cat]?.series || {};
  Object.entries(series).forEach(([key, val]) => {
    const opt = document.createElement("option");
    opt.value = key;
    opt.textContent = val.label;
    selectSerie.appendChild(opt);
  });
  // Sélectionne la première série par défaut
  const firstSerie = Object.keys(series)[0];
  if (firstSerie) {
    selectSerie.value = firstSerie;
    currentSerie = firstSerie;
    updateMatieres(cat, firstSerie);
  }
}

function updateMatieres(cat, serie) {
  selectMatiere.innerHTML = '<option value="">-- Choisir --</option>';
  const matieres = MENU[cat]?.series[serie]?.matieres || {};
  Object.entries(matieres).forEach(([key, val]) => {
    const opt = document.createElement("option");
    opt.value = key;
    opt.textContent = val.actif ? val.label : `${val.label} 🔜`;
    opt.disabled = !val.actif;
    selectMatiere.appendChild(opt);
  });
  // Sélectionne la première matière active par défaut
  const firstActif = Object.entries(matieres).find(([, v]) => v.actif);
  if (firstActif) {
    selectMatiere.value = firstActif[0];
    currentMatiere = firstActif[0];
  }
  // appelle de updatechapitres
  updateChapitres(firstActif ? firstActif[0] : "");
}

// ====== Mise à jour des chapitres ======

/*function updateChapitres(matiere) {
  selectChapitre.innerHTML =
    '<option value="">-- Sélectionne un chapitre --</option>';

  // Vide le textarea quand on change de matière
  inputText.value = "";
  selectChapitre.value = "";

  const chapitres = CHAPITRES[matiere] || [];

  if (chapitres.length === 0) {
    chapitreSelectBox.style.display = "none";
    return;
  }

  chapitreSelectBox.style.display = "flex";

  chapitres.forEach((ch) => {
    const opt = document.createElement("option");

    if (ch.startsWith(" ===")) {
      // C'est un séparateur
      opt.value = "";
      opt.textContent = ch;
      opt.disabled = true;
      opt.style.fontWeight = "bold";
      opt.style.color = "#6366f1";
    } else {
      opt.value = ch;
      opt.textContent = ch;
    }

    selectChapitre.appendChild(opt);
  });
}*/

function updateChapitres(matiere) {
  selectChapitre.innerHTML =
    '<option value="">-- Sélectionne un chapitre --</option>';

  const chapitres = CHAPITRES[matiere] || [];

  if (chapitres.length === 0) {
    chapitreSelectBox.style.display = "none";
    return;
  }

  chapitreSelectBox.style.display = "flex";

  chapitres.forEach((ch) => {
    const opt = document.createElement("option");

    if (
      ch.match(
        /^\d|^🧬|^🧪|^🫀|^🌿|^🌍|^📐|^📊|^📏|^🔢|^⚡|^🔌|^🌊|^⚗️|^🔬|^🧠/,
      )
    ) {
      // Titre principal avec fond
      opt.value = ch;
      opt.textContent = ch;
      opt.style.fontWeight = "bold";
      opt.style.background = "#1a3a6b";
      opt.style.color = "white";
    } else if (ch.startsWith("◆")) {
      // Sous-titre
      opt.value = ch;
      opt.textContent = "🔹" + ch.slice(1);
      opt.style.fontWeight = "600";
      opt.style.color = "#6366f1";
    } else {
      // Chapitre normal
      opt.value = ch;
      opt.textContent = "    " + ch;
    }

    selectChapitre.appendChild(opt);
  });
}
// Quand l'étudiant choisit un chapitre
selectChapitre.addEventListener("change", () => {
  if (selectChapitre.value) {
    inputText.value = selectChapitre.value;
  }
});

// Quand l'étudiant tape dans la zone texte
inputText.addEventListener("input", () => {
  // Quand l'étudiant tape dans la zone texte
  if (inputText) {
    inputText.addEventListener("input", () => {
      if (inputText.value.trim() !== selectChapitre.value) {
        selectChapitre.value = "";
      }
    });
  }
});

// Clics sur les catégories
catBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    catBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentCat = btn.dataset.cat;
    // Initialisation
    updateSeries(currentCat);
    updateChapitres(currentMatiere);
  });
});

// Changement de série
selectSerie.addEventListener("change", () => {
  currentSerie = selectSerie.value;
  updateMatieres(currentCat, currentSerie);
});

// Changement de matière
selectMatiere.addEventListener("change", () => {
  currentMatiere = selectMatiere.value;
});
//tests
selectMatiere.addEventListener("change", () => {
  currentMatiere = selectMatiere.value;
  updateChapitres(currentMatiere);
});

// Initialisation
updateSeries(currentCat);

// ====== id ========
function getOrCreateAnonymousId() {
  let id = localStorage.getItem("anonymousId");

  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("anonymousId", id);
  }

  return id;
}

const anonymousId = getOrCreateAnonymousId();

// ====== État ======
let currentMode = "bac"; // "bac" | "ens"
let currentQCM = [];

// ====== Utils ======
function cleanOptionText(opt) {
  if (!opt) return "";
  let s = String(opt).trim();

  // Enlève autant de préfixes que nécessaire: "A.", "A)", "A -", "A:"
  while (/^[A-D]\s*[\.\)\-:]\s*/i.test(s)) {
    s = s.replace(/^[A-D]\s*[\.\)\-:]\s*/i, "").trim();
  }

  return s;
}

// fonction utiles
function clearUI() {
  ensExerciceSection.style.display = "none";
  ensExerciceEl.innerHTML = "";
  ensBaremeSection.style.display = "none";
  ensBaremeEl.innerHTML = "";
  ensPiegesSection.style.display = "none";
  ensPiegesEl.innerHTML = "";
  ensPlanSection.style.display = "none";
  ensPlanEl.innerHTML = "";
  resumeEl.textContent = "";
  pointsEl.innerHTML = "";
  flashcardsEl.innerHTML = "";
  qcmEl.innerHTML = "";
  motsClesEl.innerHTML = "";
  statusEl.textContent = "";
  scoreEl.textContent = "";
  bacExerciceSection.style.display = "none";
  bacExerciceEl.innerHTML = "";
  currentQCM = [];
}

// ====== Rendu BAC / ENS ======
function render(data) {
  if (currentMatiere === "ens-svt") {
    lastEnsData = data;
  }

  if (
    currentMatiere === "bac-svt" ||
    currentMatiere === "bac-maths" ||
    currentMatiere === "bac-pc"
  ) {
    lastBacData = data;
  }
  // ====== Résumé / Points / Flashcards / Mots-clés (BAC) ======
  // Pour ENS, ces champs n’existent pas forcément, donc on garde un fallback.
  const resumeText = data.resume || data.resume_oriente_ens || "";

  if (typeof data.resume === "object") {
    resumeEl.innerHTML = `
    <strong>📌 Définition</strong>
    <p>${data.resume.definition}</p>

    <strong>⚙️ Mécanismes essentiels</strong>
    <ul>${(data.resume.mecanismes || []).map((m) => `<li>${m}</li>`).join("")}</ul>

    <strong>🖼️ Schémas importants à réaliser</strong>
<ul>${(data.resume.schemas_importants || [])
      .map(
        (s) => `
  <li>
    <strong>${s.titre}</strong><br/>
    📝 ${s.instructions}<br/>
    <em>Éléments obligatoires : ${(s.elements_obligatoires || []).join(", ")}</em>
  </li>
`,
      )
      .join("")}</ul>
   
    <strong>✅ Conclusion</strong>
    <p>${data.resume.conclusion}</p>
  `;
  } else {
    resumeEl.textContent = data.resume || "";
  }

  const points = data.points_cles || data.notions_a_maitriser || [];
  points.forEach((p) => {
    const li = document.createElement("li");
    li.textContent = p;
    pointsEl.appendChild(li);
  });

  const flashcards = data.flashcards || [];
  flashcards.forEach((card) => {
    const div = document.createElement("div");
    div.className = "flashcard";
    div.innerHTML = `
      <strong>Q:</strong> ${card.q}
      <div class="answer"><strong>R:</strong> ${card.a}</div>
    `;
    div.addEventListener("click", () => div.classList.toggle("open"));
    flashcardsEl.appendChild(div);
  });

  const mots = data.mots_cles || [];
  mots.forEach((m) => {
    const span = document.createElement("span");
    span.className = "tag";
    span.textContent = m;
    motsClesEl.appendChild(span);
  });

  // ====== QCM (BAC + ENS) ======
  currentQCM = data.qcm || [];
  qcmEl.innerHTML = "";

  currentQCM.forEach((item, idx) => {
    const box = document.createElement("div");
    box.className = "flashcard";
    box.dataset.qindex = String(idx);

    const title = document.createElement("div");
    title.innerHTML = `<strong>${idx + 1}. ${item.question}</strong>`;
    box.appendChild(title);

    const ul = document.createElement("ul");

    (item.options || []).forEach((opt, i) => {
      const li = document.createElement("li");
      const letter = ["A", "B", "C", "D"][i];
      const textOpt = cleanOptionText(opt);

      // BAC: on affiche "A. texte"
      // ENS: souvent les options viennent déjà "A. ..." donc on affiche juste le texte nettoyé
      const labelText =
        currentMode === "bac" ? `${letter}. ${textOpt}` : textOpt;

      li.innerHTML = `
        <label>
          <input type="radio" name="qcm-${idx}" value="${letter}" />
          ${labelText}
        </label>
      `;

      ul.appendChild(li);
    });

    box.appendChild(ul);

    // ============== Explication cachée (révélée uniquement après Corriger) ==============
    const exp = document.createElement("div");
    exp.className = "answer";
    exp.style.display = "none";
    exp.innerHTML = `
      <strong>Bonne réponse:</strong> ${item.bonne_reponse}<br/>
      <strong>Explication:</strong> ${item.explication}
    `;
    box.appendChild(exp);

    qcmEl.appendChild(box);
  });

  // ====== ENS: Plan 7 jours ======
  if (currentMatiere === "ens-svt" && Array.isArray(data.plan_revision_7j)) {
    ensPlanSection.style.display = "block";
    ensPlanEl.innerHTML = "";

    data.plan_revision_7j.forEach((d) => {
      const box = document.createElement("div");
      box.className = "day";

      const tasks = Array.isArray(d.taches) ? d.taches : [];

      box.innerHTML = `
      <h3>Jour ${d.jour} — ${d.objectif || ""}</h3>
      <ul>
        ${tasks.map((t) => `<li>${t}</li>`).join("")}
      </ul>
    `;
      ensPlanEl.appendChild(box);
    });
  }

  // ====== ENS: Pièges fréquents ======
  if (currentMatiere === "ens-svt" && Array.isArray(data.pieges_frequents)) {
    ensPiegesSection.style.display = "block";
    ensPiegesEl.innerHTML = "";

    data.pieges_frequents.forEach((p) => {
      const li = document.createElement("li");
      li.textContent = p;
      ensPiegesEl.appendChild(li);
    });
  }

  // ====== ENS: Questions longues ======
  if (currentMatiere === "ens-svt" && Array.isArray(data.questions_type_ens)) {
    ensLongSection.style.display = "block";
    ensLongEl.innerHTML = "";

    data.questions_type_ens.forEach((q, i) => {
      const box = document.createElement("div");
      box.className = "longq";

      const attendus = Array.isArray(q.attendus) ? q.attendus : [];
      const plan = Array.isArray(q.plan_reponse) ? q.plan_reponse : [];

      box.innerHTML = `
      <h3>${i + 1}. ${q.question || ""}</h3>

      <div class="sub">Attendus</div>
      <ul>${attendus.map((a) => `<li>${a}</li>`).join("")}</ul>

      <div class="sub">Plan de réponse</div>
      <ol>${plan.map((p) => `<li>${p}</li>`).join("")}</ol>
    `;

      ensLongEl.appendChild(box);
    });
  }

  // ====== ENS: Mini-barème ======
  if (currentMatiere === "ens-svt" && Array.isArray(data.mini_bareme)) {
    ensBaremeSection.style.display = "block";
    ensBaremeEl.innerHTML = "";

    data.mini_bareme.forEach((b) => {
      const li = document.createElement("li");
      li.textContent = `${b.element} — ${b.points} pts`;
      ensBaremeEl.appendChild(li);
    });
  }

  // ====== ENS: Exercice corrigé ======
  if (currentMatiere === "ens-svt" && data.exercice_type) {
    ensExerciceSection.style.display = "block";
    ensExerciceEl.innerHTML = "";

    const ex = data.exercice_type;

    const etapes =
      ex.corrige && Array.isArray(ex.corrige.etapes) ? ex.corrige.etapes : [];

    ensExerciceEl.innerHTML = `
    <div class="longq">
      <h3>Énoncé</h3>
      <p>${ex.enonce || ""}</p>

      <h3>Corrigé — Étapes</h3>
      <ol>
        ${etapes.map((e) => `<li>${e}</li>`).join("")}
      </ol>

      <h3>Résultat</h3>
      <p><strong>${ex.corrige?.resultat || ""}</strong></p>
    </div>
  `;
  }

  if (
    (currentMatiere === "bac-svt" ||
      currentMatiere === "bac-maths" ||
      currentMatiere === "bac-pc") &&
    data.exercice_type_bac
  ) {
    bacExerciceSection.style.display = "block";
    bacExerciceEl.innerHTML = "";

    const ex = data.exercice_type_bac;
    const s = (v) => (v == null ? "" : String(v));

    let html = `
    <div class="longq">
      <h3>Consigne</h3>
      <p>${s(ex.consigne)}</p>

      <h3>Enoncé</h3>
      <p>${s(ex.enonce)}</p>

      <h3>Questions</h3>
      <ol>
        ${(ex.questions || [])
          .map(
            (q) => `
          <li>
            ${s(q.question)}
            <em style="color: var(--accent)"> (${s(q.bareme)} pts)</em>
          </li>
        `,
          )
          .join("")}
      </ol>

      <h3>Corrigé</h3>
      <ol>
        ${(ex.corrige?.reponses || [])
          .map(
            (r) => `
          <li>${s(r.reponse)}</li>
        `,
          )
          .join("")}
      </ol>

      <p>
        <strong style="color: var(--accent2)">
          Barème total : ${s(ex.corrige?.bareme_total)} pts
        </strong>
      </p>
    </div>
  `;

    bacExerciceEl.innerHTML = html;
  } else if (currentMatiere === "bac-svt" || currentMatiere === "bac-maths") {
    bacExerciceSection.style.display = "none";
  }

  if (currentMatiere === "ens-svt") {
    btnDownloadPdf.style.display = "inline-block";
    btnDownloadBacPdf.style.display = "none";
  } else {
    btnDownloadPdf.style.display = "none";
    btnDownloadBacPdf.style.display = "inline-block";
  }
}

// ====== Générer ======
/*btnGenerate.addEventListener("click", async () => {
  clearUI();
  statusEl.textContent = "⏳ Génération IA en cours...";*/
btnGenerate.addEventListener("click", async () => {
  clearUI();

  // Messages rotatifs
  const messages = [
    "⏳ Analyse du chapitre...",
    "🧠 L'IA prépare ta fiche...",
    "📝 Génération des exercices...",
    "🎯 Création du QCM...",
    "📄 Finalisation de ta fiche...",
    "🔍 Vérification du contenu...",
    "🚀 Presque prêt...",
  ];

  let msgIndex = 0;
  statusEl.textContent = messages[0];
  statusEl.style.color = "";

  const interval = setInterval(() => {
    msgIndex = (msgIndex + 1) % messages.length;
    statusEl.textContent = messages[msgIndex];
  }, 2000);

  // ==== Scroll doux vers le message ===
  // Scroll vers les messages rotatifs
  setTimeout(() => {
    smoothScrollTo(statusEl);
  }, 100);

  const text = inputText.value;

  const mode = currentMatiere; // "bac" ou "ens"
  const language = langEl.value; // "fr" ou "en"

  currentMode = currentMatiere;

  if (currentMode === "ens") {
    badgeEns.classList.add("active");
    badgeBac.classList.remove("active");
  } else {
    badgeBac.classList.add("active");
    badgeEns.classList.remove("active");
  }

  const ROUTES = {
    "bac-svt": "/generate",
    "bac-maths": "/generate-maths",
    "bac-pc": "/generate-pc",
    "ens-svt": "/generate-ens",
  };

  // === garde pour test en local ====
  //const BASE = "http://localhost:3000";

  // ==== Production ========
  const BASE = "https://prepconcours-ai-backend.onrender.com";

  const route = ROUTES[mode] || null;

  if (!route) {
    statusEl.textContent = "⏳ Cette matière arrive bientôt !";
    return;
  }

  const url = `${BASE}${route}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, language, anonymousId }),
    });
    // === clear interval ===
    clearInterval(interval);

    const data = await res.json();

    if (!res.ok) {
      if (res.status === 429) {
        statusEl.textContent = "⛔ " + (data.error || "Limite atteinte.");
        statusEl.style.color = "#ef4444";
        statusEl.style.borderColor = "rgba(239,68,68,0.5)";
      } else {
        statusEl.textContent = "❌ Erreur: " + (data.error || "inconnue");
      }
      return;
    }

    statusEl.textContent = "✅ Terminé";
    render(data);

    // === Scroll vers le résumé ===
    setTimeout(() => {
      smoothScrollTo(resumeEl);
    }, 300);
   
  } catch (err) {
    clearInterval(interval);
    statusEl.textContent = "❌ Problème réseau: " + err.message;
  }
});

// ====== Corriger ======
btnCorriger.addEventListener("click", () => {
  if (!currentQCM.length) return;

  let score = 0;

  currentQCM.forEach((question, index) => {
    const selected = document.querySelector(
      `input[name="qcm-${index}"]:checked`,
    );

    const box = qcmEl.querySelector(`[data-qindex="${index}"]`);
    const exp = box ? box.querySelector(".answer") : null;

    const isCorrect = selected && selected.value === question.bonne_reponse;

    if (isCorrect) score++;

    // ===== Appliquer style pro (classes CSS) ======
    if (box) {
      box.classList.remove("correct", "wrong");
      box.classList.add(isCorrect ? "correct" : "wrong");
    }

    // ======== Révéler l'explication après correction ========
    if (exp) exp.style.display = "block";
  });

  scoreEl.textContent = `🎯 Score : ${score} / ${currentQCM.length}`;
});

// =========== Event downloard pdf ==========
btnDownloadPdf.addEventListener("click", async () => {
  try {
    if (!lastEnsData) {
      alert("Génère d'abord une fiche ENS !");
      return;
    }

    const res = await fetch(
      //"https://prepconcours-ai-backend.onrender.com/export-ens-pdf",
      "http://localhost:3000/export-ens-pdf",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anonymousId,
          ...lastEnsData,
        }),
      },
    );

    if (!res.ok) {
      const errData = await res.json();
      if (res.status === 429) {
        alert("⛔ " + (errData.error || "Limite PDF atteinte."));
      } else {
        alert("❌ Erreur génération PDF");
      }
      return;
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ENS_PrepConcours.pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  } catch (err) {
    console.error(err);
    alert("Erreur réseau");
  }
});

// =========== Téléchargement PDF BAC ===========
btnDownloadBacPdf.addEventListener("click", async () => {
  try {
    if (!lastBacData) {
      alert("Génère d'abord une fiche BAC !");
      return;
    }

    const res = await fetch(
      //"https://prepconcours-ai-backend.onrender.com/export-bac-pdf",
      "http://localhost:3000/export-bac-pdf",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anonymousId,
          ...lastBacData,
        }),
      },
    );

    if (!res.ok) {
      alert("Erreur génération PDF BAC");
      return;
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "BAC_PrepConcours.pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  } catch (err) {
    console.error(err);
    alert("Erreur réseau");
  }
});
