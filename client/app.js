// ====== Éléments UI ======
const inputText = document.getElementById("inputText");
const btnGenerate = document.getElementById("btnTest");

const modeEl = document.getElementById("mode"); // "bac" ou "ens"
const langEl = document.getElementById("lang"); // "fr" ou "en"

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
  currentQCM = [];
}

// ====== Rendu BAC / ENS ======
function render(data) {
  // ====== Résumé / Points / Flashcards / Mots-clés (BAC) ======
  // Pour ENS, ces champs n’existent pas forcément, donc on garde un fallback.
  const resumeText = data.resume || data.resume_oriente_ens || "";
  //resumeEl.textContent = resumeText;

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
  if (currentMode === "ens" && Array.isArray(data.plan_revision_7j)) {
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
  if (currentMode === "ens" && Array.isArray(data.pieges_frequents)) {
    ensPiegesSection.style.display = "block";
    ensPiegesEl.innerHTML = "";

    data.pieges_frequents.forEach((p) => {
      const li = document.createElement("li");
      li.textContent = p;
      ensPiegesEl.appendChild(li);
    });
  }

  // ====== ENS: Questions longues ======
  if (currentMode === "ens" && Array.isArray(data.questions_type_ens)) {
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
  if (currentMode === "ens" && Array.isArray(data.mini_bareme)) {
    ensBaremeSection.style.display = "block";
    ensBaremeEl.innerHTML = "";

    data.mini_bareme.forEach((b) => {
      const li = document.createElement("li");
      li.textContent = `${b.element} — ${b.points} pts`;
      ensBaremeEl.appendChild(li);
    });
  }

  // ====== ENS: Exercice corrigé ======
  if (currentMode === "ens" && data.exercice_type) {
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

  if (currentMode === "ens") {
    btnDownloadPdf.style.display = "inline-block";
  } else {
    btnDownloadPdf.style.display = "none";
  }
}

// ====== Générer ======
btnGenerate.addEventListener("click", async () => {
  /*e.preventDefault();
  e.stopPropagation();*/
  clearUI();
  statusEl.textContent = "⏳ Génération IA en cours...";

  const text = inputText.value;

  const mode = modeEl.value; // "bac" ou "ens"
  const language = langEl.value; // "fr" ou "en"
  // Applique la langue au chargement
  /*document.addEventListener("DOMContentLoaded", () => {
    applyLanguage(langEl.value);
  });

  // Applique la langue quand l'étudiant change
  langEl.addEventListener("change", () => {
    applyLanguage(langEl.value);
  });*/
  currentMode = mode;

  if (currentMode === "bac") {
    badgeBac.classList.add("active");
    badgeEns.classList.remove("active");
  } else {
    badgeEns.classList.add("active");
    badgeBac.classList.remove("active");
  }

  const url =
    mode === "ens"
      ? "https://prepconcours-ai-backend.onrender.com/generate-ens"
      : "https://prepconcours-ai-backend.onrender.com/generate";

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, language, anonymousId }),
    });

    const data = await res.json();

    if (!res.ok) {
      statusEl.textContent = "❌ Erreur: " + (data.error || "inconnue");
      return;
    }

    statusEl.textContent = "✅ Terminé";
    render(data);
  } catch (err) {
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

    // Appliquer style pro (classes CSS)
    if (box) {
      box.classList.remove("correct", "wrong");
      box.classList.add(isCorrect ? "correct" : "wrong");
    }

    // Révéler l'explication après correction
    if (exp) exp.style.display = "block";
  });

  scoreEl.textContent = `🎯 Score : ${score} / ${currentQCM.length}`;
});

// =========== Event downloard pdf ==========
btnDownloadPdf.addEventListener("click", async () => {
  try {
    const res = await fetch("https://prepconcours-ai-backend.onrender.com/export-ens-pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        anonymousId,
        resume_oriente_ens: resumeEl.textContent,
        notions_a_maitriser: Array.from(pointsEl.querySelectorAll("li")).map(
          (li) => li.textContent,
        ),
      }),
    });

    if (!res.ok) {
      alert("Erreur génération PDF");
      return;
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "ENS_Biologie.pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();

    window.URL.revokeObjectURL(url);
  } catch (err) {
    console.error(err);
    alert("Erreur réseau");
  }
});
