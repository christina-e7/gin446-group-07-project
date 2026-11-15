# Written answers (edit into your own words)

**Task 1 – Why two flex containers?** `.site-header` lays out the brand and the nav as two items, and the auto margin on the nav pushes it to the end. `.nav-list` is a separate container because the links are inside the nav's `<ul>`; flex only affects direct children, so the list needs its own flex rule to put the links in a row with a gap.

**Task 2 – flex-basis and wrapping.** `flex-basis` is the ideal starting size of an item before free space is shared out (28rem for the copy, 16rem for the summary). Wrapping happens when the combined bases plus the gap no longer fit on one line (about 46rem+), so the summary drops below the copy. `min-width: 0` stops long content from forcing an item wider than its container.

**Task 3 – Equal height across rows?** No. Cards on the same row stretch to the same height (`align-items: stretch`), but each wrapped row is its own flex line, so rows are sized independently. Auto top margin on the link pushes it to the bottom of its card, and `align-self: flex-start` stops it stretching full width.

**Challenge.** Removing `flex-wrap` forces all cards onto one line, so they shrink and can overflow or squash at small widths. Removing the auto margin on a card link makes the link sit right under the text, so links no longer line up at the bottom of cards of different heights. Both rules are restored in the final CSS.

**Individual explanation (example).** `margin-top: auto` on `.card-link`: in a flex column, auto margins absorb all free space, so the link is pushed to the bottom of the card.
