# User Stories Directory

## Purpose

This directory stores **raw user stories** submitted by users, stakeholders, or product owners. User stories describe features from the end-user's perspective.

## How to Add a User Story

### Option 1: JSON Format (Recommended for AI processing)

Create a new file: `US-XXXX.json`

```json
{
  "id": "US-0001",
  "title": "User login with email and password",
  "as_a": "registered user",
  "i_want": "to log in using my email and password",
  "so_that": "I can access my personalized dashboard",
  "priority": "high",
  "acceptance_criteria": [
    {
      "given": "I am on the login page",
      "when": "I enter valid credentials",
      "then": "I should be redirected to my dashboard"
    }
  ]
}
```

### Option 2: Simple Text Format

Create a file: `my-feature-idea.txt` or `.md`

```
As a registered user
I want to log in using my email and password
So that I can access my personalized dashboard

Acceptance Criteria:
- User can enter email and password
- Valid credentials redirect to dashboard
- Invalid credentials show error message
- Account locks after 3 failed attempts
```

The AI agent will convert this to structured JSON format automatically.

## What Happens Next

Once you add a user story here, the AI agent will:

1. **Validate** the story structure
2. **Generate** detailed requirements (REQ-XXXX files)
3. **Extract** personas and workflows
4. **Process** and move to `requirements/processed/user-stories/`
5. **Create** specifications in `specs/`
6. **Generate** implementation code in `src/`
7. **Create** tests in `tests/`

## File Naming

- **JSON format**: `US-XXXX.json` (e.g., `US-0001.json`)
- **Text format**: Any descriptive name (e.g., `login-feature.md`)

The AI will assign proper US-XXXX IDs during processing.

## Examples

See `templates/user-story.template.md` for detailed examples and guidelines.

## Status

User stories in this directory are considered **raw** and **unprocessed**. After AI processing, they will be moved to `requirements/processed/user-stories/` with enhanced information and linked requirements.
