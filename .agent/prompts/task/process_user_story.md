# Task: Process User Story

## Objective

Transform a user story into structured requirements, extract personas, and prepare for specification design.

## Input

- User story (JSON format from `requirements/raw/user-stories/`)
- Existing personas from `knowledge/domain/`
- Related user stories
- Project context from `.state/current/project-state.json`

## Processing Steps

### 1. Validate User Story Structure

- Check against `templates/user-story.schema.json`
- Ensure "As a / I want / So that" format is complete
- Verify acceptance criteria are specific and testable
- Validate story points are reasonable

### 2. Extract and Enrich

**Persona Extraction:**
- Identify user role and characteristics
- Match with existing personas or create new one
- Document goals and pain points
- Store in `knowledge/domain/personas.json`

**Functional Requirements:**
- Break down story into atomic functional requirements
- Generate requirement IDs (REQ-XXXX)
- Link requirements to user story (US-XXXX)
- Document in `requirements/processed/functional/`

**Non-Functional Requirements:**
- Extract implicit NFRs (performance, security, usability)
- Example: "quick login" → performance requirement
- Example: "secure account" → security requirement
- Document in `requirements/processed/non-functional/`

**Acceptance Criteria Enhancement:**
- Convert to testable format (Given-When-Then)
- Add edge cases if missing
- Identify test scenarios
- Generate test requirements

### 3. Dependency Analysis

- Identify dependent user stories
- Detect prerequisite features
- Find conflicting stories
- Update dependency graph

### 4. Estimate Complexity

If story points not provided:
- Analyze scope and complexity
- Consider technical dependencies
- Estimate using Fibonacci scale (1,2,3,5,8,13,21)
- Document estimation rationale

### 5. Generate Artifacts

**Requirement Documents:**
```json
{
  "id": "REQ-XXXX",
  "source_user_story": "US-XXXX",
  "type": "functional",
  "title": "...",
  "description": "...",
  "acceptance_criteria": [...],
  "priority": "derived from story priority",
  "status": "proposed"
}
```

**Updated User Story:**
```json
{
  "...original fields...",
  "related_requirements": ["REQ-0001", "REQ-0002"],
  "generated_artifacts": {
    "requirements": [...],
    "test_scenarios": [...],
    "personas": [...]
  },
  "analysis": {
    "complexity_score": 0.0-1.0,
    "risk_factors": [...],
    "technical_considerations": [...]
  }
}
```

### 6. Identify Workflows

- Extract user workflows from acceptance criteria
- Map user journey
- Identify system interactions
- Document in `knowledge/domain/workflows.json`

### 7. Quality Checks

- All acceptance criteria are testable
- Business value is clear
- Story is appropriately sized
- Dependencies are documented
- Requirements are complete and unambiguous

## Output Format

```json
{
  "user_story_id": "US-XXXX",
  "processing_result": {
    "status": "success|needs_refinement|error",
    "validation_score": 0.0-1.0,
    "issues": ["list of issues found"],
    "recommendations": ["list of recommendations"]
  },
  "generated_requirements": [
    {
      "id": "REQ-XXXX",
      "type": "functional|non-functional",
      "file_path": "requirements/processed/.../REQ-XXXX.json"
    }
  ],
  "extracted_personas": [
    {
      "name": "persona name",
      "file_path": "knowledge/domain/personas.json"
    }
  ],
  "workflows": [
    {
      "name": "workflow name",
      "description": "...",
      "steps": [...]
    }
  ],
  "test_scenarios": [
    {
      "scenario": "...",
      "type": "unit|integration|e2e",
      "priority": "high|medium|low"
    }
  ],
  "dependencies": {
    "blocks": ["US-XXXX"],
    "blocked_by": ["US-XXXX"],
    "related": ["US-XXXX"]
  },
  "next_steps": [
    "action items for moving forward"
  ],
  "metadata": {
    "processed_at": "ISO-8601",
    "processor_version": "version",
    "confidence_score": 0.0-1.0
  }
}
```

## Decision Points

**If story is incomplete:**
- Generate suggestions for missing parts
- Flag for stakeholder input
- Document assumptions made

**If story is too large:**
- Propose breakdown into smaller stories
- Suggest epic structure
- Document sub-stories

**If dependencies are unclear:**
- Flag for clarification
- Suggest potential dependencies
- Document assumptions

## Success Criteria

- ✅ All requirements generated and validated
- ✅ Personas extracted and documented
- ✅ Workflows mapped
- ✅ Test scenarios identified
- ✅ Dependencies documented
- ✅ Confidence score ≥ 0.8
- ✅ Ready for specification design

## Error Handling

If processing fails:
1. Document failure reason
2. Identify blocking issues
3. Generate refinement questions
4. Save partial results
5. Flag for human review if needed
