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

// =========== Optimisation BAC ==============
const toggleOptimise = document.getElementById("toggleOptimise");
const optimiseSection = document.getElementById("optimiseSection");
const optimiseContent = document.getElementById("optimiseContent");
const labelNormal = document.getElementById("labelNormal");
const labelOptimise = document.getElementById("labelOptimise");

// ← Ajoute ces deux lignes ici
const selectChapitre = document.getElementById("selectChapitre");
const chapitreSelectBox = document.getElementById("chapitreSelectBox");

const titreOptimise = document.getElementById("titreOptimise");
const btnDownloadOptimisePdf = document.getElementById(
  "btnDownloadOptimisePdf",
);

// ====== Feedback ======
const feedbackSection = document.getElementById("feedbackSection");
const starsRow = document.getElementById("starsRow");
const starLabel = document.getElementById("starLabel");
const feedbackComment = document.getElementById("feedbackComment");
const btnFeedback = document.getElementById("btnFeedback");
const feedbackStatus = document.getElementById("feedbackStatus");
let selectedStars = 0;

// === garde pour test en local ====
//const BASE = "http://localhost:3000";

// ===== backend ========
const BASE = "https://prepconcours-ai-backend.onrender.com";

// Toggle ON/OFF
toggleOptimise.addEventListener("change", () => {
  /*if (toggleOptimise.checked) {
    labelNormal.classList.remove("active");
    labelOptimise.classList.add("active");
  } else {
    labelNormal.classList.add("active");
    labelOptimise.classList.remove("active");
  }*/
  if (toggleOptimise.checked) {
    btnDownloadPdf.style.display = "none";
    btnDownloadBacPdf.style.display = "none";
    btnDownloadOptimisePdf.style.display = "inline-block";
  } else if (currentMatiere === "ens-svt") {
    btnDownloadPdf.style.display = "inline-block";
    btnDownloadBacPdf.style.display = "none";
    btnDownloadOptimisePdf.style.display = "none";
  } else {
    btnDownloadPdf.style.display = "none";
    btnDownloadBacPdf.style.display = "inline-block";
    btnDownloadOptimisePdf.style.display = "none";
  }
});

// Initialisation
labelNormal.classList.add("active");

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
          "bac-c-maths": { label: "Mathématiques", actif: true },
          "bac-c-pc": { label: "Physique-Chimie", actif: true },
          "bac-c-svt": { label: "SVT", actif: true },
        },
      },
      "bac-a": {
        label: "Série A",
        matieres: {
          "bac-a-francais": { label: "Francais", actif: true },
          "bac-a-philosophie": { label: "Philosophie", actif: true },
          "bac-a-histoire-geo": { label: "Histoire-Géographie", actif: true },
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
          "f4-maths": { label: "Mathématiques", actif: true },
          "f4-physique": { label: "Physique", actif: true },
          "f4-techno": { label: "Technologie du Bâtiment", actif: true },
          "f4-dessin": { label: "Dessin Technique", actif: true },
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

  // ======== BAC C ==========
  "bac-c-maths": [
    "📐 1 ANALYSE",
    "◆ Limites et continuité",
    "Les limites de fonctions",
    "La continuité des fonctions",
    "◆ Dérivation",
    "Les fonctions dérivées",
    "L'étude complète de fonctions",
    "◆ Fonctions usuelles",
    "Les fonctions logarithme",
    "Les fonctions exponentielles",
    "◆ Intégration",
    "Les primitives",
    "Les intégrales",
    "Les équations différentielles",
    "◆ Suites",
    "Les suites numériques",
    "Les suites arithmétiques et géométriques",

    "🔢 2 ALGÈBRE",
    "◆ Nombres complexes",
    "Les nombres complexes forme algébrique",
    "Les nombres complexes forme trigonométrique",
    "◆ Arithmétique",
    "Le PGCD et les congruences",
    "La divisibilité",
    "◆ Matrices",
    "Les matrices [À VÉRIFIER]",

    "📏 3 GÉOMÉTRIE",
    "◆ Géométrie dans l'espace",
    "La géométrie vectorielle dans l'espace",
    "Les droites et plans dans l'espace",
    "◆ Métriques",
    "Le produit scalaire",
    "Les distances et angles",
    "Les transformations géométriques",

    "📊 4 PROBABILITÉS & STATISTIQUES",
    "◆ Probabilités",
    "Les variables aléatoires",
    "La loi binomiale",
    "L'espérance mathématique",
    "◆ Statistiques",
    "Les statistiques descriptives",
  ],

  "bac-c-pc": [
    "⚙️ 1 MÉCANIQUE",
    "◆ Mouvement",
    "Le mouvement rectiligne",
    "La vitesse et l'accélération",

    "◆ Dynamique",
    "Les lois de Newton",
    "La quantité de mouvement",
    "Le travail et l'énergie",

    "◆ Mouvement circulaire",
    "Le mouvement circulaire uniforme",
    "La force centripète",

    "⚡ 2 ÉLECTRICITÉ",
    "◆ Circuits électriques",
    "La loi d'Ohm",
    "Les lois de Kirchhoff",

    "◆ Dipôles électriques",
    "Les résistances",
    "Les condensateurs",
    "Les circuits RC et RLC",

    "🌊 3 ONDES ET OPTIQUE",
    "◆ Ondes",
    "Les ondes mécaniques",
    "La propagation des ondes",

    "◆ Optique",
    "Les lentilles minces",
    "La formation des images",
    "Les instruments d'optique",

    "⚛️ 4 PHYSIQUE MODERNE",
    "◆ Structure de l'atome",
    "Les modèles atomiques",
    "Le noyau atomique",

    "◆ Radioactivité",
    "Les types de radioactivité",
    "Les réactions nucléaires",

    "🧪 5 CHIMIE",
    "◆ Structure de la matière",
    "Les liaisons chimiques",
    "Les solutions",

    "◆ Réactions chimiques",
    "Les réactions acido-basiques",
    "Les réactions d'oxydoréduction",

    "◆ Chimie organique",
    "Les alcools",
    "Les acides carboxyliques",
    "Les esters",
  ],

  "bac-c-svt": [
    "🧬 1 BIOLOGIE CELLULAIRE",
    "◆ Organisation de la cellule",
    "La cellule et ses organites",
    "La membrane plasmique",
    "Les échanges cellulaires",

    "◆ Division cellulaire",
    "La mitose",
    "La méiose",
    "Le cycle cellulaire",

    "🧪 2 GÉNÉTIQUE",
    "◆ Transmission des caractères",
    "La génétique mendélienne",
    "Les lois de Mendel",
    "Les croisements génétiques",

    "◆ Support de l'information génétique",
    "L'ADN",
    "La réplication de l'ADN",
    "La synthèse des protéines",

    "🧠 3 PHYSIOLOGIE HUMAINE",
    "◆ Fonction de relation",
    "Le système nerveux",
    "Les organes des sens",
    "La coordination nerveuse",

    "◆ Fonction de reproduction",
    "La reproduction humaine",
    "La fécondation",
    "Le développement embryonnaire",

    "🌿 4 ÉCOLOGIE",
    "◆ Les écosystèmes",
    "Les relations entre les êtres vivants",
    "Les chaînes alimentaires",

    "◆ L'homme et l'environnement",
    "La pollution",
    "La protection de l'environnement",
    "Le développement durable",
  ],

  // ============ BAC FRANCAIS =========
  "bac-a-francais": [
    "📖 1 LANGUE ET EXPRESSION",
    "◆ Grammaire et syntaxe",
    "Les fonctions grammaticales",
    "La syntaxe de la phrase complexe",
    "Les propositions subordonnées",
    "◆ Lexique et stylistique",
    "Les figures de style",
    "Le champ lexical et sémantique",
    "La formation des mots",
    "◆ Expression écrite",
    "La dissertation littéraire",
    "Le commentaire composé",
    "Le résumé et la synthèse",

    "📚 2 LITTÉRATURE",
    "◆ Genres littéraires",
    "Le roman et la nouvelle",
    "La poésie et ses formes",
    "Le théâtre et ses genres",
    "◆ Mouvements littéraires",
    "Le classicisme et l'humanisme",
    "Le romantisme",
    "Le réalisme et le naturalisme",
    "Le surréalisme et les avant-gardes",
    "◆ Littérature africaine et francophone",
    "Les grands auteurs africains francophones",
    "Les thèmes de la littérature africaine",
    "La négritude",

    "✍️ 3 MÉTHODOLOGIE",
    "◆ Techniques d'analyse",
    "L'analyse d'un texte littéraire",
    "L'explication linéaire",
    "◆ Production écrite",
    "La rédaction d'une dissertation",
    "L'écriture d'invention",
    "La contraction de texte",
  ],

  "bac-a-philosophie": [
    "🧠 1 LA CONNAISSANCE",
    "◆ La vérité et la raison",
    "La vérité et ses critères",
    "La raison et l'expérience",
    "La démonstration et le raisonnement",
    "◆ La science",
    "Les méthodes scientifiques",
    "La relation science et technique",
    "Les limites de la science",

    "👤 2 L'ÊTRE HUMAIN ET LA SOCIÉTÉ",
    "◆ La conscience et l'inconscient",
    "La conscience et la connaissance de soi",
    "L'inconscient freudien",
    "◆ La liberté et la responsabilité",
    "La liberté comme valeur fondamentale",
    "Le déterminisme et le libre arbitre",
    "La responsabilité morale",
    "◆ Autrui et la société",
    "La relation à l'autre",
    "Le langage et la communication",
    "La culture et la nature",

    "⚖️ 3 MORALE ET POLITIQUE",
    "◆ L'éthique",
    "Les théories morales",
    "Le devoir et la vertu",
    "Les droits de l'homme",
    "◆ La politique",
    "L'État et le pouvoir",
    "La démocratie et ses formes",
    "La justice et le droit",

    "🌍 4 MÉTAPHYSIQUE ET RELIGION",
    "◆ L'existence et le sens",
    "Les grandes questions existentielles",
    "La religion et la foi",
    "◆ Grands courants philosophiques",
    "Le rationalisme et l'empirisme",
    "L'existentialisme",
    "La philosophie africaine",
  ],

  "bac-a-histoire-geo": [
    "🏛️ 1 HISTOIRE",
    "◆ Le monde au XIXe siècle",
    "Les révolutions industrielles",
    "Les nationalismes en Europe",
    "La colonisation de l'Afrique",
    "◆ Les guerres mondiales",
    "Les causes et le déroulement de la 1ère GM",
    "Les causes et le déroulement de la 2ème GM",
    "Les conséquences des guerres mondiales",
    "◆ Le monde après 1945",
    "La guerre froide",
    "La décolonisation africaine",
    "La création de l'ONU et les organisations internationales",
    "◆ L'Afrique et le Cameroun",
    "Les grands empires africains précoloniaux",
    "La résistance à la colonisation",
    "L'histoire politique du Cameroun indépendant",

    "🌍 2 GÉOGRAPHIE",
    "◆ Géographie physique",
    "Les milieux naturels africains",
    "Le relief et l'hydrographie",
    "Les climats et la végétation",
    "◆ Géographie humaine",
    "La démographie africaine",
    "Les migrations et l'urbanisation",
    "Les populations et leurs dynamiques",
    "◆ Géographie économique",
    "Les ressources naturelles de l'Afrique",
    "Le développement économique africain",
    "Les grandes puissances mondiales",
    "◆ Géographie du Cameroun",
    "Les régions naturelles du Cameroun",
    "L'économie camerounaise",
    "Le Cameroun dans la sous-région CEMAC",

    "🗺️ 3 MÉTHODOLOGIE",
    "◆ Outils géographiques",
    "La lecture et l'analyse de cartes",
    "La construction de croquis et schémas",
    "◆ Production écrite",
    "La composition en histoire",
    "La composition en géographie",
    "Le commentaire de document historique",
  ],

  // =============== BAC TECHNIQUES =====================
  // ==== tech ====
  "f4-techno": [
    "🏗️ 1 MATÉRIAUX DE CONSTRUCTION",
    "◆ Liants et bétons",
    "Les liants hydrauliques (ciment, chaux)",
    "La composition et fabrication du béton",
    "Le béton armé : principes et mise en œuvre",
    "◆ Granulats et adjuvants",
    "Les granulats : sable, gravier, ballast",
    "Les adjuvants et leur rôle",
    "◆ Autres matériaux",
    "Les matériaux de maçonnerie (parpaing, brique, pierre)",
    "Les matériaux métalliques en construction",
    "Le bois et les matériaux composites",
    "Les matériaux d'étanchéité et d'isolation",

    "🧱 2 FONDATIONS ET TERRASSEMENT",
    "◆ Terrassement",
    "Les travaux de terrassement",
    "Les engins de terrassement",
    "Le compactage des sols",
    "◆ Fondations superficielles",
    "Les semelles isolées",
    "Les semelles filantes",
    "Les radiers",
    "◆ Fondations profondes",
    "Les pieux et leurs types",
    "Les barrettes et parois moulées",
    "Le dimensionnement des fondations",

    "🏛️ 3 STRUCTURE ET OSSATURE",
    "◆ Maçonnerie et murs",
    "Les murs porteurs en maçonnerie",
    "Les murs de refend et voiles béton",
    "Les chaînages horizontaux et verticaux",
    "◆ Poteaux et poutres",
    "Les poteaux en béton armé",
    "Les poutres et leur calcul",
    "Les portiques et ossatures",
    "◆ Planchers",
    "Les planchers corps creux",
    "Les dalles pleines",
    "Les planchers préfabriqués",
    "Le calcul des planchers",

    "🔺 4 CHARPENTE ET TOITURE",
    "◆ Charpente traditionnelle",
    "Les éléments de la charpente en bois",
    "Les fermes et leur dimensionnement",
    "L'assemblage des pièces de charpente",
    "◆ Charpente métallique",
    "Les profilés métalliques",
    "Les assemblages boulonnés et soudés",
    "◆ Couverture",
    "Les types de toiture (tuiles, tôles, terrasse)",
    "L'étanchéité des toitures",
    "L'isolation thermique des toitures",

    "🚪 5 SECOND ŒUVRE",
    "◆ Revêtements",
    "Les enduits et crépis",
    "Les carrelages et faïences",
    "Les peintures et revêtements muraux",
    "◆ Menuiserie",
    "La menuiserie bois (portes, fenêtres)",
    "La menuiserie aluminium et PVC",
    "◆ Plomberie et assainissement",
    "Les réseaux d'alimentation en eau",
    "Les réseaux d'évacuation et assainissement",
    "◆ Électricité du bâtiment",
    "Les installations électriques",
    "Les normes électriques en bâtiment",

    "📐 6 RÉSISTANCE DES MATÉRIAUX",
    "◆ Notions fondamentales",
    "Les efforts internes : traction, compression, flexion",
    "Les contraintes et déformations",
    "Le module d'élasticité (loi de Hooke)",
    "◆ Calculs de résistance",
    "Le calcul des poutres en flexion simple",
    "Le calcul des poteaux en compression",
    "Le flambement des pièces comprimées",
    "◆ Béton armé calcul",
    "Le calcul des sections en béton armé",
    "La vérification des états limites (ELU/ELS)",
    "Le ferraillage des éléments structuraux",

    "🗺️ 7 TOPOGRAPHIE ET IMPLANTATION",
    "◆ Topographie",
    "Les instruments de mesure topographique",
    "Le nivellement et les altitudes",
    "Le levé de plans topographiques",
    "◆ Implantation",
    "L'implantation d'un ouvrage",
    "Les calculs de cubature",
    "Les terrassements en déblai et remblai",

    "📋 8 ORGANISATION ET GESTION DE CHANTIER",
    "◆ Planification",
    "Le planning de chantier (Gantt, PERT)",
    "Les modes d'organisation du chantier",
    "◆ Documents techniques",
    "La lecture et interprétation des plans",
    "Le cahier des charges (CCTP)",
    "Les métrés et devis quantitatifs",
    "◆ Sécurité chantier",
    "Les règles de sécurité sur chantier",
    "Les équipements de protection individuelle",
  ],

  // =========== f4 maths ========
  "f4-maths": [
    "📐 1 ANALYSE",
    "◆ Fonctions et limites",
    "Les fonctions numériques",
    "Les limites de fonctions",
    "La continuité des fonctions",
    "◆ Dérivation",
    "Les fonctions dérivées",
    "L'étude de fonctions appliquée au bâtiment",
    "◆ Intégration",
    "Les primitives et intégrales",
    "Les applications des intégrales (aires, volumes)",

    "📊 2 STATISTIQUES ET PROBABILITÉS",
    "◆ Statistiques",
    "Les statistiques descriptives",
    "Les moyennes et dispersions",
    "La représentation graphique des données",
    "◆ Probabilités",
    "Les probabilités de base",
    "Les variables aléatoires",

    "📏 3 GÉOMÉTRIE APPLIQUÉE",
    "◆ Géométrie plane",
    "Les figures planes et leurs propriétés",
    "Les aires et périmètres",
    "Les transformations géométriques",
    "◆ Géométrie dans l'espace",
    "Les solides géométriques",
    "Les volumes et surfaces",
    "Les sections planes de solides",
    "◆ Trigonométrie appliquée",
    "Les fonctions trigonométriques",
    "La résolution de triangles",
    "Les applications en topographie",

    "🔢 4 ALGÈBRE APPLIQUÉE",
    "◆ Équations et systèmes",
    "Les équations du 1er et 2ème degré",
    "Les systèmes d'équations linéaires",
    "Les inéquations",
    "◆ Calcul matriciel",
    "Les matrices et opérations",
    "La résolution de systèmes par matrices",
    "◆ Suites numériques",
    "Les suites arithmétiques",
    "Les suites géométriques",
    "Les applications financières (intérêts, amortissement)",

    "🏗️ 5 MATHÉMATIQUES APPLIQUÉES AU BÂTIMENT",
    "◆ Métrés et cubatures",
    "Le calcul des surfaces de bâtiment",
    "Le calcul des volumes de terrassement",
    "Les métrés de maçonnerie et béton",
    "◆ Résistance des matériaux (calculs)",
    "Les calculs de contraintes normales",
    "Les calculs de déformations",
    "Les moments fléchissants et efforts tranchants",
    "◆ Hydraulique appliquée",
    "Les calculs de débit et pression",
    "Le dimensionnement des canalisations",
  ],

  // ====== f4 Dessin ======

  "f4-dessin": [
    "✏️ 1 NORMES ET CONVENTIONS",
    "◆ Normalisation",
    "Les normes de dessin technique (ISO)",
    "Les formats de papier et cartouches",
    "Les types de traits et leurs significations",
    "Les échelles et leur utilisation",
    "◆ Écriture normalisée",
    "Les chiffres et lettres normalisés",
    "La cotation normalisée",
    "Les symboles et abréviations",

    "📐 2 GÉOMÉTRIE DESCRIPTIVE",
    "◆ Projections orthogonales",
    "Le principe des projections orthogonales",
    "Les vues : face, dessus, profil",
    "La correspondance entre les vues",
    "◆ Coupes et sections",
    "Les coupes simples",
    "Les coupes brisées et partielles",
    "Les sections droites et obliques",
    "◆ Perspectives",
    "La perspective cavalière",
    "La perspective isométrique",
    "La perspective axonométrique",

    "🏗️ 3 DESSIN DE BÂTIMENT",
    "◆ Plans architecturaux",
    "Le plan de masse",
    "Le plan de situation",
    "Le plan d'implantation",
    "◆ Plans d'exécution",
    "Le plan de fondations",
    "Le plan de coffrage",
    "Le plan de ferraillage",
    "◆ Coupes et façades",
    "Les coupes verticales de bâtiment",
    "Les façades et élévations",
    "Les détails d'exécution",

    "🔺 4 DESSIN DE CHARPENTE ET TOITURE",
    "◆ Charpente bois",
    "Le dessin des fermes en bois",
    "Les assemblages et détails de charpente",
    "◆ Charpente métallique",
    "Le dessin des profilés métalliques",
    "Les assemblages boulonnés et soudés",
    "◆ Toiture",
    "Le dessin de toiture en plan",
    "Les coupes de toiture",
    "Les noues et arêtiers",

    "🚰 5 DESSIN DES RÉSEAUX",
    "◆ Plomberie",
    "Le schéma des réseaux d'eau",
    "Les symboles de plomberie",
    "◆ Assainissement",
    "Le schéma d'assainissement",
    "Les réseaux EP et EU",
    "◆ Électricité",
    "Le schéma électrique du bâtiment",
    "Les symboles électriques normalisés",

    "💻 6 DAO - DESSIN ASSISTÉ PAR ORDINATEUR",
    "◆ Initiation au DAO",
    "Les logiciels de DAO (AutoCAD, ArchiCAD)",
    "L'interface et les commandes de base",
    "◆ Production de plans",
    "La création de plans 2D",
    "La mise en page et l'impression",
    "L'export et les formats de fichiers",

    "📋 7 LECTURE ET INTERPRÉTATION DE PLANS",
    "◆ Lecture de plans",
    "L'identification des éléments sur un plan",
    "La lecture des cotations et symboles",
    "L'interprétation des coupes",
    "◆ Implantation sur chantier",
    "Le report des mesures depuis le plan",
    "La vérification de la conformité",
  ],

  // ====== f4 physique ======

  "f4-physique": [
    "⚡ 1 MÉCANIQUE APPLIQUÉE",
    "◆ Statique",
    "Les forces et leurs caractéristiques",
    "L'équilibre des solides",
    "Les moments de forces",
    "Les conditions d'équilibre",
    "◆ Résistance des matériaux",
    "Les contraintes de traction et compression",
    "Les contraintes de cisaillement",
    "La flexion simple des poutres",
    "Le flambement des pièces comprimées",
    "◆ Cinématique",
    "Le mouvement rectiligne uniforme",
    "Le mouvement rectiligne uniformément varié",
    "Les machines de chantier (vitesse, puissance)",

    "🌊 2 HYDRAULIQUE",
    "◆ Hydrostatique",
    "La pression hydrostatique",
    "La poussée d'Archimède",
    "La pression dans les fluides au repos",
    "◆ Hydrodynamique",
    "L'écoulement des fluides",
    "Le débit et la vitesse d'écoulement",
    "Le théorème de Bernoulli",
    "◆ Applications hydrauliques",
    "Les pompes et leur fonctionnement",
    "Le dimensionnement des canalisations",
    "L'assainissement et les réseaux d'eau",

    "🌡️ 3 THERMIQUE DU BÂTIMENT",
    "◆ Transferts thermiques",
    "La conduction thermique",
    "La convection thermique",
    "Le rayonnement thermique",
    "◆ Isolation thermique",
    "La résistance thermique des matériaux",
    "Le coefficient U (déperditions thermiques)",
    "Le calcul des ponts thermiques",
    "◆ Confort thermique",
    "La ventilation et le renouvellement d'air",
    "La climatisation et le chauffage",
    "Les normes thermiques en construction",

    "🔌 4 ÉLECTRICITÉ APPLIQUÉE AU BÂTIMENT",
    "◆ Courant continu",
    "La loi d'Ohm",
    "Les circuits série et parallèle",
    "La puissance et l'énergie électrique",
    "◆ Courant alternatif",
    "Le courant alternatif sinusoïdal",
    "Les valeurs efficaces et de crête",
    "La puissance active et réactive",
    "◆ Installations électriques",
    "Les sections de câbles et disjoncteurs",
    "La mise à la terre et sécurité",
    "Les normes électriques NFC 15-100",

    "🔊 5 ACOUSTIQUE DU BÂTIMENT",
    "◆ Notions d'acoustique",
    "Le son et ses caractéristiques",
    "Le niveau sonore en décibels",
    "◆ Isolation acoustique",
    "La transmission du son dans les bâtiments",
    "Les matériaux absorbants et isolants",
    "Les normes acoustiques en construction",

    "💡 6 ÉCLAIRAGE ET OPTIQUE",
    "◆ Notions d'éclairage",
    "Le flux lumineux et l'éclairement",
    "Les sources lumineuses naturelles et artificielles",
    "◆ Conception de l'éclairage",
    "Le calcul d'un projet d'éclairage",
    "Les normes d'éclairage en bâtiment",
    "L'éclairage de sécurité",
  ],

  // ===== Concours ENS =====================
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
  updateToggleLabel();
}

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

// ← Ajoute ici
function updateToggleLabel() {
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

  if (MATIERES_CONCOURS.includes(currentMatiere)) {
    labelOptimise.textContent = "🏆 Optimisé Concours";
    titreOptimise.textContent = "🏆 Optimisé Concours";
  } else {
    labelOptimise.textContent = "🎯 Optimisé BAC";
    titreOptimise.textContent = "🎯 Optimisé BAC";
  }
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
    updateSeries(currentCat);
    updateToggleLabel();
    updateChapitres(currentMatiere);
  });
});

// Changement de série
selectSerie.addEventListener("change", () => {
  currentSerie = selectSerie.value;
  updateMatieres(currentCat, currentSerie);
  updateToggleLabel();
});

// Changement de matière
selectMatiere.addEventListener("change", () => {
  currentMatiere = selectMatiere.value;
  updateChapitres(currentMatiere);
  updateToggleLabel();
});

// ====== PDF Optimisé ======
btnDownloadOptimisePdf.addEventListener("click", async () => {
  try {
    if (!lastBacData) {
      statusEl.textContent = "⛔ Génère d'abord une fiche Optimisée !";
      return;
    }

    const res = await fetch(`${BASE}/export-optimise-pdf`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        anonymousId,
        ...lastBacData,
      }),
    });

    if (!res.ok) {
      try {
        const errData = await res.json();
        if (res.status === 429) {
          statusEl.textContent =
            "⛔ " + (errData.error || "Limite PDF atteinte.");
          statusEl.style.color = "#ef4444";
          smoothScrollTo(statusEl);
        } else {
          statusEl.textContent = "❌ Erreur génération PDF Optimisé";
          statusEl.style.color = "#ef4444";
        }
      } catch {
        statusEl.textContent = "❌ Erreur génération PDF Optimisé";
        statusEl.style.color = "#ef4444";
      }
      return;
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Optimise_PrepConcours.pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  } catch (err) {
    console.error(err);
    statusEl.textContent = "❌ Erreur réseau PDF Optimisé";
    statusEl.style.color = "#ef4444";
  }
});

// Initialisation
updateSeries(currentCat);
updateToggleLabel();
updateChapitres(currentMatiere);

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
  optimiseSection.style.display = "none";
  btnDownloadOptimisePdf.style.display = "none";
  optimiseContent.innerHTML = "";
  currentQCM = [];

  // Reset feedback
  feedbackSection.style.display = "none";
  feedbackStatus.textContent = "";
  feedbackComment.value = "";
  selectedStars = 0;
  document
    .querySelectorAll(".star")
    .forEach((s) => s.classList.remove("active"));
  starLabel.textContent = "Clique sur une étoile";
  btnFeedback.disabled = false;
  btnFeedback.textContent = "Envoyer mon avis 🚀";
}

// ====== Rendu BAC / ENS ========================================================
function render(data) {
  if (currentMatiere === "ens-svt") {
    lastEnsData = data;
  }

  if (
    currentMatiere === "bac-svt" ||
    currentMatiere === "bac-maths" ||
    currentMatiere === "bac-pc" ||
    currentMatiere === "bac-c-maths" ||
    currentMatiere === "bac-c-pc" ||
    currentMatiere === "bac-c-svt" ||
    currentMatiere === "f4-techno" ||
    currentMatiere === "f4-maths" ||
    currentMatiere === "f4-dessin" ||
    currentMatiere === "f4-physique" ||
    toggleOptimise.checked
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
      currentMatiere === "bac-pc" ||
      currentMatiere === "bac-c-maths" ||
      currentMatiere === "bac-c-pc" ||
      currentMatiere === "f4-techno" ||
      currentMatiere === "f4-maths" ||
      currentMatiere === "f4-dessin" ||
      currentMatiere === "f4-physique" ||
      currentMatiere === "bac-c-svt") &&
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

  if (toggleOptimise.checked) {
    btnDownloadPdf.style.display = "none";
    btnDownloadBacPdf.style.display = "none";
    btnDownloadOptimisePdf.style.display = "inline-block"; // ← ajoute ici
  } else if (currentMatiere === "ens-svt") {
    btnDownloadPdf.style.display = "inline-block";
    btnDownloadBacPdf.style.display = "none";
    btnDownloadOptimisePdf.style.display = "none";
  } else {
    btnDownloadPdf.style.display = "none";
    btnDownloadBacPdf.style.display = "inline-block";
    btnDownloadOptimisePdf.style.display = "none";
  }

  // ====== Mode Optimisé BAC ======
  if (toggleOptimise.checked && data.importance) {
    optimiseSection.style.display = "block";

    const s = (v) => (v == null ? "" : String(v));

    // Badge importance
    const badgeClass =
      data.importance === "Très fréquent"
        ? "importance-tres-frequent"
        : data.importance === "Important"
          ? "importance-important"
          : "importance-secondaire";

    let html = `
    <span class="importance-badge ${badgeClass}">
      ⭐ ${s(data.importance)}
    </span>
    <p>${s(data.pourquoi_important)}</p>

    <h3>📌 Compétences réellement testées</h3>
    <ul>
      ${(data.competences_testees || []).map((c) => `<li>${s(c)}</li>`).join("")}
    </ul>

    <h3>🧪 Types d'exercices déjà tombés</h3>
    ${(data.types_exercices || [])
      .map(
        (t) => `
      <div style="margin-bottom: 10px;">
        <strong>${s(t.type)}</strong>
        <span class="importance-badge ${
          t.frequence === "Très fréquent"
            ? "importance-tres-frequent"
            : t.frequence === "Fréquent"
              ? "importance-important"
              : "importance-secondaire"
        }" style="margin-left: 8px; font-size: 11px;">
          ${s(t.frequence)}
        </span>
        <p style="margin: 4px 0 0 0; font-size: 13px;">${s(t.description)}</p>
      </div>
    `,
      )
      .join("")}

    <h3>⚠️ Pièges fréquents</h3>
    <ul>
      ${(data.pieges_frequents || []).map((p) => `<li>${s(p)}</li>`).join("")}
    </ul>

    <h3>💡 Conseils pour l'examen</h3>
    <ul>
      ${(data.conseils_examen || []).map((c) => `<li>${s(c)}</li>`).join("")}
    </ul>

    <h3>📝 Exercice type BAC + Corrigé</h3>
    <div class="longq">
      <h4>Consigne</h4>
      <p>${s(data.exercice_optimise?.consigne)}</p>
      <h4>Énoncé</h4>
      <p>${s(data.exercice_optimise?.enonce)}</p>
      <h4>Questions</h4>
      <ol>
        ${(data.exercice_optimise?.questions || [])
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
      <h4>Corrigé</h4>
      <ol>
        ${(data.exercice_optimise?.corrige?.reponses || [])
          .map(
            (r) => `
          <li>${s(r.reponse)}</li>
        `,
          )
          .join("")}
      </ol>
      <p>
  <strong style="color: var(--accent)">
    Barème total : ${s(data.exercice_optimise?.corrige?.bareme_total)} pts
  </strong>
</p>
<div style="margin-top: 10px;">
  <strong>Détail du barème :</strong>
  ${(data.exercice_optimise?.corrige?.bareme_detail || [])
    .map(
      (b) => `
    <div style="display:flex; justify-content:space-between; 
                padding: 4px 0; border-bottom: 1px solid var(--border)">
      <span>${s(b.critere)}</span>
      <strong style="color: var(--accent)">${s(b.points)} pts</strong>
    </div>
  `,
    )
    .join("")}
</div>
    </div>
  `;

    optimiseContent.innerHTML = html;
  } else {
    optimiseSection.style.display = "none";
  }
}

// ====== Générer ======
btnGenerate.addEventListener("click", async () => {
  clearUI();

  // ===== Messages rotatifs ======
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
  const language = langEl.value;
  const mode = currentMatiere;
  const isOptimise = toggleOptimise.checked;

  currentMode = currentMatiere;

  if (currentMode === "ens-svt") {
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
    "bac-c-maths": "/generate-maths",
    "bac-c-pc": "/generate-pc",
    "bac-c-svt": "/generate",
    "bac-a-francais": "/generate-bac-a-francais",
    "bac-a-philo": "/generate-bac-a-philo",
    "bac-a-histoire-geo": "/generate-bac-a-histoire-geo",

    // ===== BAC TECH F4 ======
    "f4-techno": "/generate-f4-techno",
    "f4-maths": "/generate-f4-maths",
    "f4-dessin": "/generate-f4-dessin",
    "f4-physique": "/generate-f4-physique",

    // ==== Conours ENS ======
    "ens-svt": "/generate-ens",
  };

  const ROUTES_OPTIMISE = {
    "bac-svt": "/generate-optimise",
    "bac-maths": "/generate-optimise",
    "bac-pc": "/generate-optimise",
    "bac-c-maths": "/generate-optimise",
    "bac-c-pc": "/generate-optimise",
    "bac-c-svt": "/generate-optimise",
    "bac-a-francais": "/generate-optimise",
    "bac-a-philo": "/generate-optimise",
    "bac-a-histoire-geo": "/generate-optimise",

    // ===== BAC TECH F4 =========
    "f4-techno": "/generate-optimise",
    "f4-maths": "/generate-optimise",
    "f4-dessin": "/generate-optimise",
    "f4-physique": "/generate-optimise",

    // ==== Conours ENS ===========
    "ens-svt": "/generate-optimise",
  };

  const route = isOptimise
    ? ROUTES_OPTIMISE[mode] || null
    : ROUTES[mode] || null;

  if (!route) {
    statusEl.textContent = "⏳ Cette matière arrive bientôt !";
    clearInterval(interval);
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

    // Afficher le formulaire de feedback
    feedbackSection.style.display = "block";
    smoothScrollTo(feedbackSection);

    // === Scroll vers le résumé ===
    setTimeout(() => {
      smoothScrollTo(resumeEl);
    }, 300);
  } catch (err) {
    clearInterval(interval);
    statusEl.textContent =
      "⛔ Vous avez atteint votre limite de 2 générations gratuites de PDF aujourd'hui. Revenez demain ou contactez-nous sur WhatsApp pour accéder à la version Premium illimitée. " +
      err.message;
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

// =========== Event downloard pdf ebs ==========
btnDownloadPdf.addEventListener("click", async () => {
  try {
    if (!lastEnsData) {
      alert("Génère d'abord une fiche ENS !");
      return;
    }

    const res = await fetch(
      // ======== Mode Test ========
      //"https://prepconcours-ai-backend.onrender.com/export-ens-pdf",
      //"http://localhost:3000/export-ens-pdf",

      // ======= Mode Prod ========
      `${BASE}/export-ens-pdf`,
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
      try {
        const errData = await res.json();
        if (res.status === 429) {
          statusEl.textContent =
            "⛔ " + (errData.error || "Limite PDF atteinte.");
          statusEl.style.color = "#ef4444";
          smoothScrollTo(statusEl);
        } else {
          statusEl.textContent = "❌ Erreur génération PDF";
          statusEl.style.color = "#ef4444";
        }
      } catch {
        statusEl.textContent = "❌ Erreur génération PDF";
        statusEl.style.color = "#ef4444";
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
      // ========= Mode Test ========

      // ====== Mode Prod =========
      `${BASE}/export-bac-pdf`,
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
      try {
        const errData = await res.json();
        if (res.status === 429) {
          statusEl.textContent =
            "⛔ " + (errData.error || "Limite PDF atteinte.");
          statusEl.style.color = "#ef4444";
          smoothScrollTo(statusEl);
        } else {
          statusEl.textContent = "❌ Erreur génération PDF";
          statusEl.style.color = "#ef4444";
        }
      } catch {
        statusEl.textContent = "❌ Erreur génération PDF";
        statusEl.style.color = "#ef4444";
      }
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

// ====== Logique Feedback ======
const starLabels = [
  "",
  "Pas utile 😕",
  "Peut mieux faire 🤔",
  "Bien 👍",
  "Très bien 😊",
  "Excellent ! 🔥",
];

document.querySelectorAll(".star").forEach((star) => {
  star.addEventListener("mouseover", () => {
    const val = parseInt(star.dataset.value);
    document.querySelectorAll(".star").forEach((s, i) => {
      s.classList.toggle("active", i < val);
    });
    starLabel.textContent = starLabels[val];
  });

  star.addEventListener("mouseleave", () => {
    document.querySelectorAll(".star").forEach((s, i) => {
      s.classList.toggle("active", i < selectedStars);
    });
    starLabel.textContent = selectedStars
      ? starLabels[selectedStars]
      : "Clique sur une étoile";
  });

  star.addEventListener("click", () => {
    selectedStars = parseInt(star.dataset.value);
    document.querySelectorAll(".star").forEach((s, i) => {
      s.classList.toggle("active", i < selectedStars);
    });
    starLabel.textContent = starLabels[selectedStars];
  });
});

btnFeedback.addEventListener("click", async () => {
  if (!selectedStars) {
    feedbackStatus.textContent = "⚠️ Choisis d'abord une note !";
    feedbackStatus.style.color = "#ef4444";
    return;
  }

  const payload = {
    anonymousId,
    note: selectedStars,
    commentaire: feedbackComment.value.trim(),
    matiere: currentMatiere,
    chapitre: inputText.value.trim().substring(0, 100),
  };

  try {
    btnFeedback.disabled = true;
    btnFeedback.textContent = "Envoi en cours...";

    await fetch(`${BASE}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    feedbackStatus.textContent =
      "✅ Merci pour ton retour ! Ça aide à améliorer l'app 🙏";
    feedbackStatus.style.color = "#22c55e";
    btnFeedback.textContent = "Envoyé ✅";
    feedbackComment.value = "";
    selectedStars = 0;
    document
      .querySelectorAll(".star")
      .forEach((s) => s.classList.remove("active"));
    starLabel.textContent = "Clique sur une étoile";
  } catch (err) {
    feedbackStatus.textContent = "❌ Erreur envoi, réessaie.";
    feedbackStatus.style.color = "#ef4444";
    btnFeedback.disabled = false;
    btnFeedback.textContent = "Envoyer mon avis 🚀";
  }
});
