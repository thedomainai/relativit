# User Story Template

## Basic Format

```
As a [user role/persona]
I want [functionality]
So that [business value/benefit]
```

## Example

```json
{
  "id": "US-0001",
  "title": "User login with email and password",
  "as_a": "registered user",
  "i_want": "to log in using my email and password",
  "so_that": "I can access my personalized dashboard and data",
  "priority": "high",
  "status": "ready",
  "story_points": 5,
  "acceptance_criteria": [
    {
      "given": "I am on the login page",
      "when": "I enter valid email and password and click 'Login'",
      "then": "I should be redirected to my dashboard"
    },
    {
      "given": "I am on the login page",
      "when": "I enter invalid credentials",
      "then": "I should see an error message 'Invalid email or password'"
    },
    {
      "given": "I enter wrong password 3 times",
      "when": "I attempt a 4th login",
      "then": "my account should be temporarily locked for 15 minutes"
    }
  ],
  "persona": {
    "name": "Sarah",
    "role": "End User",
    "goals": ["Access personal data quickly", "Secure account"],
    "pain_points": ["Forgot password frequently", "Slow login process"]
  },
  "tags": ["authentication", "security", "user-management"],
  "metadata": {
    "created_at": "2025-12-17T00:00:00Z",
    "created_by": "product_owner",
    "confidence_score": 0.95
  }
}
```

## Acceptance Criteria Format: Given-When-Then

**Given** [initial context/precondition]
**When** [action or event]
**Then** [expected outcome]

## Tips for Writing Good User Stories

### DO:
- Keep stories small and focused (completable in one sprint)
- Use clear, simple language
- Focus on user value, not implementation
- Include specific acceptance criteria
- Make stories testable
- Include the "so that" clause to explain value

### DON'T:
- Write technical implementation details
- Make stories too large (break into smaller stories)
- Use vague terms like "better", "improved", "enhanced"
- Forget acceptance criteria
- Mix multiple features in one story
- Skip the business value explanation

## Story Sizing (Fibonacci)

- **1-2 points**: Simple changes, clear implementation
- **3-5 points**: Standard feature, some complexity
- **8-13 points**: Complex feature, multiple components
- **21+ points**: Too large - break down into smaller stories

## Story Status Lifecycle

1. **draft** - Initial creation, needs refinement
2. **ready** - Fully defined, ready for development
3. **in_progress** - Actively being developed
4. **blocked** - Waiting on dependency or decision
5. **completed** - Implemented and validated
6. **rejected** - Not moving forward

## AI Agent Processing

When you submit a user story, the AI agent will:

1. **Validate** structure and completeness
2. **Generate** detailed requirements (REQ-XXXX)
3. **Extract** personas and workflows
4. **Identify** dependencies
5. **Suggest** acceptance criteria if missing
6. **Estimate** complexity and story points
7. **Link** to related stories and requirements
8. **Create** specifications and implementation plans

## Location in Project

- **Raw stories**: `requirements/raw/user-stories/`
- **Processed stories**: `requirements/processed/user-stories/`
- **Schema**: `templates/user-story.schema.json`
