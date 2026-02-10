Add tasks to PRD.md's Planned section.

Input: $ARGUMENTS (one or more tasks to add)

## Instructions

1. If $ARGUMENTS is empty, ask the user what tasks they want to add

2. Parse $ARGUMENTS for multiple tasks:
   - If multiple lines, treat each line as a separate task
   - If comma-separated, treat each item as a separate task
   - Otherwise treat as a single task

3. Read PRD.md, find the "## Planned" section

4. Add each task as a new bullet point: `- <task>`
   - If section contains "(add tasks with /prd or edit directly)" or similar placeholder, replace it with the tasks

5. Confirm to user what was added and show the updated Planned section
