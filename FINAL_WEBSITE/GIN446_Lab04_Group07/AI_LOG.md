# AI Development Log

## Interaction 1
Task:
What was I trying to achieve?
Understand my CSS Grid code and get it reviewed for responsiveness.
AI tool:
Claude

My prompt:
"I am new to CSS Grid. Explain my CSS code line by line, especially display: grid, grid-template-columns, repeat(), fr, and gap. Do not rewrite my code. After the explanation, ask me three short questions to check whether I understand it."

AI recommendation:
Replace repeat(3, 1fr) with repeat(auto-fit, minmax(200px, 1fr)) so the grid adapts to small screens, move the CSS from the <style> tag into style.css, and add a hover effect on .cell.

My decision:
ACCEPT (auto-fit and moving the CSS), MODIFY (hover effect, simplified to a background color change).
Why:

Verification:

What I learned:

## Interaction 2

Task:
What was I trying to achieve?
Fix the horizontal overflow caused by grid-template-columns: 300px 300px 300px on a 375 px screen.

AI tool:
Claude

My prompt:
"Why does this CSS cause horizontal overflow on a 375px screen? Give possible corrections and explain each one."


AI recommendation:
Use flexible columns with repeat(auto-fit, minmax(min(100%, 250px), 1fr)), or use media queries with fewer columns.

My decision:
MODIFY. I used the auto-fit solution for the debugging challenge and media queries (3/2/1) for the main page, because the lab requires exactly those breakpoints.

Why:
Fixed 300 px columns add up to 960 px, which is wider than the screen. Media queries give exact column counts, which auto-fit does not guarantee.

Verification:
Tested in DevTools at 1440, 768 and 375 px and checked that there is no horizontal scrollbar.

What I learned:
Fixed pixel widths do not adapt to the viewport. Media queries control the layout at specific breakpoints, while auto-fit lets the browser decide. I should choose based on the requirement.
