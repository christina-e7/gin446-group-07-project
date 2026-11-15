/* =========================================================================
   GIN446 – Web Programming · Chapter 7 - JavaScript Part 2
   Lab 06: Review Before You Submit

   Student name :Christina Elias, Kevin Bou Chaaya
   Student ID   : 202500640 , 202500772

   Only HTML, CSS and JavaScript. Do not modify profile.html, style.css or
   confirmation.html: all your work is in this file.
   Test often: save, reload profile.html (F5), keep the console open (F12).
   ========================================================================= */

// The elements you need (already selected for you)
const form = document.getElementById("profile-form");
const panel = document.getElementById("review");
const list = document.getElementById("review-list");
const editBtn = document.getElementById("edit-btn");
const confirmBtn = document.getElementById("confirm-btn");


/* TASK 1 + TASK 2 – Intercept and validate the submission
   - Listen to the "submit" event of the form.
   - Cancel its default action, so the page stays here.
   - If the form is not valid: show the browser's warnings and stop.
   - If it is valid: showReview(collectData());                            */
// TODO (Task 1 and Task 2)


form.addEventListener("submit", function (e) {
  e.preventDefault();
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }
  showReview(collectData());
});


/* TASK 3 – Collect every value
   Return an ARRAY of objects { label, value }, one per field, for example:
     [ { label: "Full name", value: "Lea Haddad" },
       { label: "Skills",    value: "programming, ai" }, ... ]
   Fields: fullname, email, studentId, age, major, graduation (radio),
           skills (checkboxes), software (multiple select), bio, consent.   */
function collectData() {
  const rows = [];
  // TODO (Task 3)
  const fullname = document.getElementById("fullname").value;
  const email = document.getElementById("email").value;
  const studentId = document.getElementById("studentId").value;
  const age = Number(document.getElementById("age").value);

  const major = document.getElementById("major").selectedOptions[0].text;

  const graduation = document.querySelector('input[name="graduation"]:checked')?.value;

  const skills = [...document.querySelectorAll('input[name="skills"]:checked')]
    .map(function (cb) { return cb.value; });

  const software = [...document.getElementById("software").selectedOptions]
    .map(function (opt) { return opt.text; });

  const bio = document.getElementById("bio").value.trim();

  const consent = document.getElementById("consent").checked;

  rows.push({ label: "Full name", value: fullname });
  rows.push({ label: "Email", value: email });
  rows.push({ label: "Student ID", value: studentId });
  rows.push({ label: "Age", value: age });
  rows.push({ label: "Major", value: major });
  rows.push({ label: "Expected graduation", value: graduation || "(not chosen)" });
  rows.push({ label: "Skills", value: skills.length ? skills.join(", ") : "(none)" });
  rows.push({ label: "Software", value: software.length ? software.join(", ") : "(none)" });
  rows.push({ label: "Bio", value: bio || "(empty)" });
  rows.push({ label: "Consent", value: consent ? "Yes" : "No" });


  return rows;
}


/* TASK 4 – Fill and open the review panel
   For each row: create a <dt> (label) and a <dd> (value) with createElement,
   fill them with textContent, append them to the list.
   Clear the list first. Then hide the form and open the panel (classList). */
function showReview(rows) {
  // TODO (Task 4)

  list.textContent = "";

  rows.forEach(function (row) {
    const dt = document.createElement("dt");
    const dd = document.createElement("dd");
    dt.textContent = row.label;  
    dd.textContent = row.value;
    list.appendChild(dt);
    list.appendChild(dd);
  });


  form.classList.add("hidden");
  panel.classList.add("open");
}


/* TASK 5 – Edit: close the panel and show the form again (no reload).      */
// TODO (Task 5)
function closeReview() {
  panel.classList.remove("open");
  form.classList.remove("hidden");
  document.getElementById("fullname").focus();  
}

editBtn.addEventListener("click", closeReview);

document.addEventListener("keydown", function (e) {
  if (e.key === "Escape" && panel.classList.contains("open")) {
    closeReview();
  }
});

/* TASK 6 – Confirm & Submit: send the form to confirmation.html,
   WITHOUT firing the "submit" event again (no loop).                       */
// TODO (Task 6)
confirmBtn.addEventListener("click", function () {
  form.submit();
});

