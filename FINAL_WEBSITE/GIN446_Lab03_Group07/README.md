# GIN446 Group 07 project

## Team and purpose
- Members and GitHub usernames: Christina Elias (christina-e7), Kevin Bou Chaaya (kevinbouchaaya01-beep)
- Project theme and target users: CampusConnect, a campus student-services directory for new and current students
- Repository URL: https://github.com/christina-e7/gin446-group-07-project
- Render URL: https://gin446-group-07-project.onrender.com

## Local preview
Open public/index.html, or use VS Code Live Server on that file.
Optional with Python installed: `python -m http.server 5500 --directory public`
Then visit http://localhost:5500.

## Render configuration
Create a Static Site from this GitHub repository.
Branch: main. Root Directory: leave blank.
Build Command: `echo "No build required"`
Publish Directory: `public`
Enable automatic deploys on commits to main. No Start Command.
The public folder must be directly in the repository root.

## Milestone 01 checklist
- [x] Correct group name and actual project content
- [x] Header and navigation use Flexbox
- [x] Hero uses wrapping and meaningful flex bases
- [x] At least three cards with different text lengths
- [x] Equal card heights within each line and bottom-aligned links
- [ ] Tested at 375, 768, and 1280 CSS pixels, with no horizontal overflow
- [x] Keyboard focus visible and links reach real section targets
- [ ] Each member contributes at least one merged commit
- [ ] A merged change appears at the same Render URL

## Progress log
| Session | Work completed | Member contributions | Evidence |
|---|---|---|---|
| 01 | Flexbox homepage: header/nav, hero, 4 service cards, footer | Christina Elias: header/nav and hero; Kevin Bou Chaaya: cards and footer; both: README and testing (adjust to your real commits) | Commit ID / https://gin446-group-07-project.onrender.com / screenshots (add) |

## Next milestones
Grid and media queries; JavaScript filtering; HTTP API; Flask CRUD; database;
validation and access control; final tests and demonstration.

## Test results (verify, then correct if needed)
| Check | Result and correction |
|---|---|
| 375px, no horizontal scrolling | Cards stack in one column – confirm |
| 768px, readable wrapping | Two cards per row – confirm |
| 1280px, aligned card links | Links at the bottom of each card – confirm |
| 200% zoom | Content wraps and stays readable – confirm |
| Tab navigation and visible focus | Orange focus outline – confirm |
| Navigation and card targets | All links reach an existing section – confirm |
| Merged visible change on Render | Add after deployment |
