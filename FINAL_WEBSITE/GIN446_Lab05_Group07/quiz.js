/* =========================================================================
   GIN446 – Web Programming · Chapter 6 - JavaScript Part 1
   Lab05 (60 min): build a 5-question quiz with JavaScript

   Student name : Kevin Bou Chaaya, Christina Elias
   Student ID   : 202500772 , 202500640

   Rules: 
   Work in PART 1. Do not modify PART 2 (provided helpers).
   Test often: save, reload the page (F5) and read the console (F12).
   ========================================================================= */


/* =========================================================================
   PART 1 – YOUR CODE
   ========================================================================= */

/* TASK 1 – The questions (10 min)
   Each question is an object with 3 properties:
     question : the text of the question            (string)
     choices  : the 4 possible answers               (array of strings)
     answer   : the INDEX of the correct choice      (number: 0, 1, 2 or 3)
   The first question is given. Add 4 questions (5 in total) about the
   basics of Chapter 6. At least one question must have answer: 0.        */
const questions = [
  {
    question: "Which keyword declares a variable that cannot be reassigned?",
    choices: ["var", "let", "const", "static"],
    answer: 2,
  },
  {
    question: "Which operator is used to test if 2 variables are not equal?",
    choices: ["==", "!=", "<=", ">="],
    answer: 1,
  },
  {
    question: 'Which statement adds "Audi" to the end of the array cars?',
    choices: ['cars.push("Audi")', 'cars.pop("Audi")', 'cars.shift("Audi")', 'cars.length("Audi")'],
    answer: 0,
  },
  {
    question: "What does new Array(40) create?",
    choices: ["[40]", "An array with 40 empty (undefined) elements", "An empty array", "The number 40"],
    answer: 1,
  },
  {
    question: "selected[0] is 0 (a real answer). Which test correctly detects that it was answered?",
    choices: ["if (selected[0])", "if (selected[0] == false)", "if (!selected[0])", "if (selected[0] !== undefined)"],
    answer: 3,
  },

];


/* TASK 2 – The HTML of ONE question (12 min)
   Return a string with the HTML of question number `index` (0 for the first).
   Use a template string and a loop over q.choices. Expected HTML for index 0:

   <div class="question">
     <p class="question-text">1. Which keyword declares ... reassigned?</p>
     <label class="choice"><input type="radio" name="q0" value="0"> var</label>
     <label class="choice"><input type="radio" name="q0" value="1"> let</label>
     <label class="choice"><input type="radio" name="q0" value="2"> const</label>
     <label class="choice"><input type="radio" name="q0" value="3"> static</label>
   </div>

   Important: every radio button of question i has name="q" + i,
   and its value is the index of the choice.                              */
function buildQuestionHTML(q, index) {
  let html = `<div class="question">
    <p class="question-text">${index + 1}. ${q.question}</p>`;

  for (let i = 0; i < q.choices.length; i++) {
    html += `<label class="choice"><input type="radio" name="q${index}" value="${i}"> ${q.choices[i]}</label>`;
  }

  html += `</div>`;
  return html;
}


/* TASK 3 – The whole quiz (8 min)
   Loop over the questions, add the HTML of each one to a string,
   then display it with the provided helper:  showInPage("quiz", html);   */
function renderQuiz() {
  let html = "";

  for (let i = 0; i < questions.length; i++) {
    html += buildQuestionHTML(questions[i], i);
  }

  showInPage("quiz", html);
}


/* TASK 4 – The score (10 min)
   Return the number of correct answers.
   getSelectedAnswer(i) (provided) returns the index of the choice selected
   for question i, or undefined if the question was not answered.          */
function calculateScore() {
  let score = 0;

  for (let i = 0; i < questions.length; i++) {
    const selected = getSelectedAnswer(i);
    if (selected === questions[i].answer) {
      score++;
    }
  }

  return score;
}

/* TASK 5 – The message (5 min)
   Return:  5      → "Excellent! You master the basics."
            3 or 4 → "Good job, review the questions you missed."
            0 to 2 → "Review Chapter 6 and try again."                    */
function getMessage(score) {
  if (score === 5) {
    return "Excellent! You master the basics.";
  } else if (score >= 3) {
    return "Good job, review the questions you missed.";
  } else {
    return "Review Chapter 6 and try again.";
  }
}


/* TASK 6 – Submit: show the score and the correction (10 min)
   Called when the user clicks "Check my answers" (see index.html).
   Build a string with:
     <p class="score">Score: 3 / 5</p>
     <p class="message">Good job, review the questions you missed.</p>
   then ONE line per question, for example:
     <p class="line correct">1. Correct – const</p>
     <p class="line wrong">2. Incorrect – your answer: 7 · correct answer: "52"</p>
     <p class="line unanswered">3. Not answered – correct answer: ===</p>
   and display it with:  showInPage("result", html);                       */
function submitQuiz() {
  const score = calculateScore();
  let html = `<p class="score">Score: ${score} / ${questions.length}</p>`;
  html += `<p class="message">${getMessage(score)}</p>`;

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const selected = getSelectedAnswer(i);
    const correctText = q.choices[q.answer];

    if (selected === undefined) {
      html += `<p class="line unanswered">${i + 1}. Not answered – correct answer: ${correctText}</p>`;
    } else if (selected === q.answer) {
      html += `<p class="line correct">${i + 1}. Correct – ${correctText}</p>`;
    } else {
      html += `<p class="line wrong">${i + 1}. Incorrect – your answer: ${q.choices[selected]} · correct answer: ${correctText}</p>`;
    }
  }

  showInPage("result", html);
}

/* =========================================================================
   PART 2 – PROVIDED HELPERS (DOM, studied in Chapter 7) – DO NOT MODIFY
   ========================================================================= */

// Writes an HTML string inside the element that has this id.
function showInPage(id, html) {
  const element = document.getElementById(id);
  if (html === undefined || html === "") {
    element.innerHTML = `<p class="hint">Nothing to display in #${id} yet. ` +
      `Check that your function builds the HTML string and passes it to showInPage().</p>`;
    console.info(`showInPage("${id}") received an empty string.`);
    return;
  }
  element.innerHTML = html;
}

// Returns the index of the radio button checked for question i, or undefined.
function getSelectedAnswer(i) {
  const checked = document.querySelector(`input[name="q${i}"]:checked`);
  if (checked === null) {
    return undefined;
  }
  return Number(checked.value);
}

// Starts the quiz when the page is loaded.
renderQuiz();
if (document.getElementById("quiz").innerHTML === "") {
  showInPage("quiz", "");
}
