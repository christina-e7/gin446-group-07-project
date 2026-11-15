/* GIN446 – Chapter 8 - JavaScript Part 3 – Lab: Live Quiz with fetch()
   The questions are NOT written in this file: they are loaded from data/questions.json
   with fetch(). Open quiz.html with VS Code Live Server (fetch does not work from file://). */

const INFO_URL = "data/quiz-info.json";
const QUESTIONS_URL = "data/questions.json";
const BEST_KEY = "gin446-best-score";        // localStorage key

let info = null;        // contents of quiz-info.json  { title, passMark, version }
let questions = [];     // valid questions only
let current = 0;        // index of the question on screen
let score = 0;

// ---------- given helpers ----------
const $ = (id) => document.getElementById(id);
function show(id) { $(id).classList.remove("hidden"); }
function hide(id) { $(id).classList.add("hidden"); }
function wait(ms) {                                     // a Promise fulfilled after ms
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------- TASK 1 – download and parse one JSON file ----------
async function getJSON(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }
  return await response.json();
}

// ---------- TASK 2 – check one question; throw if it is not usable ----------
function validateQuestion(q) {
  if (!q || typeof q.question !== "string" || q.question.trim() === "") {
    throw new Error("missing question text");
  }
  if (!Array.isArray(q.choices) || q.choices.length < 2) {
    throw new Error("needs at least 2 choices");
  }
  if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.choices.length) {
    throw new RangeError("answer index out of range: " + q.answer);
  }
}

// ---------- TASK 3 – load the quiz: loader, parallel requests, errors ----------
async function loadQuiz() {
  hide("error"); hide("warning"); hide("quiz"); hide("result");
  show("loader");
  try {
    await wait(600);                     // simulates a slow network
    const infoPromise = getJSON(INFO_URL);
    const questionsPromise = getJSON(QUESTIONS_URL);
    const [quizInfo, all] = await Promise.all([infoPromise, questionsPromise]);
    info = quizInfo;

    questions = [];
    const warnings = [];
    for (let i = 0; i < all.length; i++) {
      try {
        validateQuestion(all[i]);
        questions.push(all[i]);
      } catch (err) {
        warnings.push(`#${i + 1} ${err.name}: ${err.message}`);
      }
    }

    if (questions.length === 0) {
      throw new Error("the file contains no valid question");
    }

    if (warnings.length > 0) {
      $("warning").textContent = warnings.join(", ");
      show("warning");
    }

    $("quiz-title").textContent = info.title;
    startQuiz();
  } catch (error) {
    $("error-msg").textContent = "Could not load the quiz: " + error.message;
    show("error");
  } finally {
    hide("loader");
  }
}

// ---------- TASK 4 – display a question and check the answer (Chapter 7) ----------
function startQuiz() {                                  // given
  current = 0;
  score = 0;
  hide("result");
  show("quiz");
  showQuestion();
}

function showQuestion() {
  const q = questions[current];
  $("progress").textContent = `Question ${current + 1} / ${questions.length}`;
  $("question").textContent = q.question;
  $("feedback").textContent = "";
  $("feedback").className = "feedback";
  $("next").disabled = true;
  $("next").textContent = current === questions.length - 1 ? "See my score" : "Next";

  const box = $("choices");
  box.textContent = "";                                 // remove the previous buttons
  q.choices.forEach((choice, i) => {
    const btn = document.createElement("button");
    btn.className = "choice";
    btn.textContent = choice;
    btn.addEventListener("click", () => checkAnswer(i));
    box.appendChild(btn);
  });
}

function checkAnswer(i) {
  const q = questions[current];
  const buttons = $("choices").querySelectorAll("button");
  
  buttons.forEach((btn) => (btn.disabled = true));
  buttons[q.answer].classList.add("correct");

  if (i === q.answer) {
    score++;
    $("feedback").textContent = "Correct!";
    $("feedback").classList.add("ok");
  } else {
    buttons[i].classList.add("wrong");
    $("feedback").textContent = `Wrong – the answer is: ${q.choices[q.answer]}`;
    $("feedback").classList.add("bad");
  }

  $("next").disabled = false;
}

$("next").addEventListener("click", function () {     // given
  current++;
  if (current < questions.length) {
    showQuestion();
  } else {
    finishQuiz();
  }
});

// ---------- TASK 5 – best score in localStorage (JSON) ----------
function readBestScore() {
  const text = localStorage.getItem(BEST_KEY);
  if (text === null) {
    return null;
  }
  try {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed.score !== "number" || typeof parsed.total !== "number") {
      throw new Error("Invalid structure");
    }
    return parsed;
  } catch (err) {
    localStorage.removeItem(BEST_KEY);
    return null;
  }
}

function saveBestScore(score, total) {
  const best = readBestScore();
  if (!best || (score / total) > (best.score / best.total)) {
    const record = {
      score: score,
      total: total,
      date: new Date().toLocaleDateString()
    };
    localStorage.setItem(BEST_KEY, JSON.stringify(record));
    return true;
  }
  return false;
}

function showBestScore() {                              // given
  const best = readBestScore();
  $("best").textContent = best ? `Best score: ${best.score} / ${best.total} (${best.date})` : "Best score: – (no game yet)";
}

// ---------- TASK 6 – result ----------
function finishQuiz() {
  hide("quiz");
  show("result");
  const total = questions.length;
  const percent = Math.round((score / total) * 100);
  $("score").textContent = `${score} / ${total}  (${percent} %)`;

  if (percent >= info.passMark) {
    $("verdict").textContent = "Passed ✔";
    $("verdict").className = "verdict ok";
  } else {
    $("verdict").textContent = `Not passed – ${info.passMark} % needed`;
    $("verdict").className = "verdict bad";
  }

  if (saveBestScore(score, total)) {
    $("verdict").textContent += " · New best score!";
    showBestScore();
  }
}

$("retry").addEventListener("click", loadQuiz);         // given
$("restart").addEventListener("click", startQuiz);

// ---------- start ----------
showBestScore();
loadQuiz();
