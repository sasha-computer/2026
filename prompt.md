@PRD.md @progress.txt

First, check the "Planned" section of PRD.md. If there are no tasks in "Planned" (empty or only contains placeholder text like "(none)"), output <promise>COMPLETE</promise> and stop.

Otherwise, proceed with ONE task:

1. Decide which task to work on from the "Planned" section.
   Pick the one YOU decide has highest priority, not necessarily the first.
2. Implement the feature.
3. Check any open feedback loops, such as types and tests.
4. After completing each task from the PRD, append your progress to progress.txt with:

- Task completed and PRD item reference
- Key decisions made and reasoning
- Files changed
- Any blockers or notes for the next iteration
- Keep entries concise. Sacrifice grammar for the sake of concision.

5. Make a git commit of that feature.
6. Update PRD.md: move the completed feature to 'In Review'.

ONLY WORK ON A SINGLE FEATURE, then stop.
