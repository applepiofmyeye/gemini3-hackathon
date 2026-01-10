# Update Tickets

This command helps you manage tickets in `tickets.md`. You can add new tickets, update ticket statuses, update descriptions, and move tickets between the main table and backlog.

## Valid Ticket Types

- **FEATURE** - New functionality or feature
- **IMPROVEMENT** - Enhancements to existing features (not a new feature)
- **BUG** - Bug fixes
- **CHORE** - Maintenance tasks, tooling, setup
- **INVESTIGATION** - Research and exploration tasks
- **REFACTOR** - Code restructuring without changing behavior
- **DOCS** - Documentation updates
- **PERFORMANCE** - Performance optimizations
- **SECURITY** - Security-related work
- **DESIGN** - UI/UX design work

## Valid Status Values

- **TODO** - Not started yet
- **IN_PROGRESS** - Currently being worked on
- **WIP** - Work in progress (alias for IN_PROGRESS)
- **BLOCKED** - Blocked by dependencies or issues
- **REVIEW** - In review or pending approval
- **COMPLETED** - Finished and done
- **CANCELLED** - Cancelled or no longer needed

## Status Transition Rules

Valid status transitions:

- `TODO` → `IN_PROGRESS`, `WIP`, `BLOCKED`, `CANCELLED`
- `IN_PROGRESS` → `TODO`, `BLOCKED`, `REVIEW`, `COMPLETED`, `CANCELLED`
- `WIP` → `TODO`, `BLOCKED`, `REVIEW`, `COMPLETED`, `CANCELLED`
- `BLOCKED` → `TODO`, `IN_PROGRESS`, `WIP`, `CANCELLED`
- `REVIEW` → `IN_PROGRESS`, `WIP`, `COMPLETED`, `CANCELLED`
- `COMPLETED` → (no transitions - completed tickets are final)
- `CANCELLED` → (no transitions - cancelled tickets are final)

## Required Fields

- **Task Type** - Must be one of the valid ticket types listed above
- **Task** - Brief title/summary of the ticket (required)
- **Description** - Detailed explanation of the ticket (required)
- **Status** - Must be one of the valid status values listed above

## Operations

### 1. Add New Ticket

When adding a new ticket:

1. Ask the user for:
   - Task Type (validate against valid types)
   - Task title (required, brief summary)
   - Description (required, detailed explanation)
   - Status (default to TODO if not specified, validate against valid statuses)
2. Add the ticket as a new row in the main table (before the `---` separator)
3. Maintain the markdown table format with proper alignment
4. Ensure the table columns are: Task Type | Task | Description | Status

### 2. Update Ticket Status

When updating a ticket status:

1. Ask the user which ticket to update (by task title or show a numbered list)
2. Show the current status
3. Ask for the new status (validate against valid statuses)
4. Check if the status transition is valid according to the transition rules
5. Update the status in the table
6. If transitioning to COMPLETED, confirm the ticket is actually done

### 3. Update Ticket Description

When updating a ticket description:

1. Ask the user which ticket to update (by task title or show a numbered list)
2. Show the current description
3. Ask for the new description
4. Update the description in the table while maintaining table formatting

### 4. Move Ticket to Backlog

When moving a ticket to backlog:

1. Ask the user which ticket to move (by task title or show a numbered list)
2. Remove the ticket from the main table
3. Add it as a bullet point in the "Backlog (Future Ideas)" section
4. Format: `- [Task Type] Task title - Description`

### 5. Move Ticket from Backlog to Main Table

When moving a ticket from backlog:

1. Show the backlog items
2. Ask the user which backlog item to promote
3. Parse the backlog item to extract Task Type, Task, and Description
4. Ask for initial status (default to TODO)
5. Add the ticket to the main table
6. Remove it from the backlog

## Formatting Rules

- Maintain the markdown table format with proper column alignment
- Keep table columns aligned using dashes: `| ------------- |`
- Preserve the header row: `| Task Type | Task | Description | Status |`
- Keep the `---` separator between the main table and backlog
- When descriptions are long, ensure they don't break the table format
- Use proper markdown table syntax with pipes `|`

## Validation

Always validate:

- Task Type is one of the valid types (case-sensitive)
- Status is one of the valid statuses (case-sensitive)
- Task title is provided and not empty
- Description is provided and not empty
- Status transitions follow the transition rules
- Table format is maintained after any changes

## Error Handling

If validation fails:

- Clearly explain what went wrong
- Show the valid options
- Ask the user to try again with corrected input

## Examples

### Adding a ticket:

User: "Add a new FEATURE ticket: 'Add dark mode toggle' with description 'Implement a dark mode toggle in the header'"

Response: Add the ticket to the table with status TODO.

### Updating status:

User: "Update the status of 'Implement RAG knowledge base' to IN_PROGRESS"

Response: Find the ticket, validate the transition from TODO to IN_PROGRESS is valid, update it.

### Moving to backlog:

User: "Move 'Add RSS feed for blog section' to backlog"

Response: Remove from main table, add to backlog section.
