---
name: wrapup
description: End-of-session routine. Update the project docs with what changed in this session and commit. Use when I say we're done for now.
---

1. Look at what changed this session (`git status`, `git diff`, and our conversation).
2. Update the docs, keeping each edit short:
   - `docs/ROADMAP.md`: move finished items to "Done", add new ideas I mentioned to the backlog.
   - `docs/DECISIONS.md`: add an entry for each real design or technical decision (what — why).
   - `docs/HISTORY.md`: add a short dated session entry (what we built, my feedback, what's next).
   - `docs/GAME_DESIGN.md` and `docs/BALANCE.md`: only if mechanics or balance changed.
   - `CLAUDE.md`: only if a convention or workflow rule changed. Keep it under 200 lines.
3. Show me a 3–5 line summary of the session and the next suggested step.
4. Commit everything with a clear message. Don't push unless I ask.
