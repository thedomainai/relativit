# Task: Analyze Requirement

## Objective

Analyze a requirement to understand its implications, dependencies, and technical considerations.

## Input

- Requirement document (JSON)
- Related requirements (if any)
- Domain knowledge from `knowledge/domain/`
- Technical knowledge from `knowledge/technical/`

## Analysis Steps

1. **Parse Requirement**
   - Extract key information
   - Identify requirement type (functional/non-functional/constraint)
   - Determine priority and scope

2. **Identify Dependencies**
   - Find related requirements
   - Identify technical dependencies
   - Map to existing components

3. **Assess Feasibility**
   - Technical complexity
   - Implementation effort
   - Risk factors
   - Potential challenges

4. **Determine Constraints**
   - Technical constraints
   - Resource constraints
   - Time constraints
   - Regulatory constraints

5. **Extract Concepts**
   - Domain entities
   - Business rules
   - Data models
   - Integrations

## Output Format

```json
{
  "requirement_id": "REQ-XXXX",
  "analysis": {
    "summary": "Brief summary of the requirement",
    "type": "functional|non-functional|constraint",
    "complexity": "low|medium|high|critical",
    "estimated_effort": "small|medium|large|xlarge",
    "feasibility": {
      "score": 0.0-1.0,
      "concerns": ["list of concerns"],
      "recommendations": ["list of recommendations"]
    }
  },
  "dependencies": {
    "requirements": ["REQ-XXXX", ...],
    "components": ["component names"],
    "external_systems": ["system names"]
  },
  "technical_considerations": {
    "architecture_impact": "description",
    "scalability": "considerations",
    "security": "considerations",
    "performance": "considerations"
  },
  "extracted_concepts": {
    "entities": ["entity1", "entity2"],
    "business_rules": ["rule1", "rule2"],
    "workflows": ["workflow descriptions"]
  },
  "constraints": {
    "technical": ["constraint1"],
    "business": ["constraint2"],
    "regulatory": ["constraint3"]
  },
  "risks": [
    {
      "description": "risk description",
      "severity": "low|medium|high",
      "mitigation": "mitigation strategy"
    }
  ],
  "recommendations": ["recommendation1", "recommendation2"],
  "metadata": {
    "confidence_score": 0.0-1.0,
    "analysis_timestamp": "ISO-8601",
    "analyzer_version": "version"
  }
}
```

## Quality Checks

- All sections must be completed
- Confidence score must be ≥ 0.8
- Dependencies must be validated
- Risks must be assessed
- Recommendations must be actionable

## Next Steps

Output will be used for:
- Specification design
- Implementation planning
- Risk management
- Resource allocation
