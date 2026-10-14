---

name: vice-city-backend-workflow
description: Use this skill when developing Backend functionality in Vice City. The AI must work exclusively on the assigned task, respect the project architecture and business rules, test its implementation, and document all relevant changes for Pull Request review.
---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

# Vice City Backend Workflow

## Purpose

Define how AI agents must work when developing Backend functionality for Vice City.

The AI must work **exclusively on the task assigned to it**.

The objective is to produce focused, reviewable changes that can be independently verified through the Pull Request.

---

## 1. Task Isolation

The AI must only work on the Jira task currently assigned.

Before modifying code, identify:

* Jira task.
* Related User Story.
* Objective.
* Description.
* Acceptance criteria.
* Relevant business rules.
* Existing implementation.

### Mandatory rule

> **Do not implement functionality outside the assigned task.**

If an unrelated problem is discovered, do not fix it automatically.

Instead, report:

```text
Unrelated issue detected

Location:
Problem:
Why it is unrelated:
Suggested future task:
```

This prevents scope creep and keeps Pull Requests focused.

---

## 2. Required Context

Before development, read:

1. `AGENTS.md`.
2. Relevant project skills.
3. `vice-city-business-rules`.
4. Existing implementation related to the task.
5. Existing tests.
6. Relevant documentation.
7. The assigned Jira task.

Do not start implementation without understanding the existing code related to the task.

---

## 3. Architecture

Respect the existing Vice City architecture.

```text
src/
├── app/
│   └── api/
├── features/
├── components/
├── services/
├── lib/
└── types/
```

Backend responsibilities should be placed in the appropriate location.

API route handlers should coordinate requests and responses.

Business logic should not be placed entirely inside `route.ts`.

Reuse existing services, utilities and types whenever possible.

---

## 4. Business Rules

The implementation must respect:

```text
vice-city-business-rules
```

Business rules must not be modified by the AI unless the task explicitly authorizes a change.

If a requirement conflicts with an existing business rule:

```text
STOP
↓
Identify the conflict
↓
Document it
↓
Request clarification
```

Never silently invent a new rule.

---

## 5. Development

The AI should:

* Reuse existing code.
* Follow existing conventions.
* Maintain TypeScript type safety.
* Validate inputs.
* Handle expected errors.
* Respect authorization.
* Apply the relevant business rules.
* Keep changes focused.
* Avoid unnecessary dependencies.
* Avoid unrelated refactoring.

Do not rewrite unrelated code merely to improve its style.

---

## 6. Testing the Implementation

The Backend agent must verify the functionality it implemented.

Depending on the task, test:

* Successful requests.
* Invalid requests.
* Missing data.
* Invalid parameters.
* Authorization.
* Business-rule restrictions.
* Edge cases.
* Error handling.
* Relevant database operations.

Tests must remain related to the assigned task.

---

## 7. Documentation

The AI must update the appropriate task documentation or README.

The documentation must describe what was **actually implemented**.

Use a structure similar to:

```md
# Task

Jira: HUXXB

## Objective

...

## What was implemented

- ...

## Files changed

- ...

## API changes

- Endpoint:
- Method:
- Request:
- Response:

## Business rules applied

- RN-XXX
- RN-XXX

## Tests performed

- ...

## Known limitations

- ...

## Verification

- [ ] Acceptance criteria verified
- [ ] Tests passed
- [ ] Build passed
- [ ] Type checks passed
```

---

## 8. Final Verification

Before considering the task complete:

* [ ] Only the assigned task was modified.
* [ ] Acceptance criteria are satisfied.
* [ ] Business rules are respected.
* [ ] Relevant tests were executed.
* [ ] Build passes when applicable.
* [ ] Type checks pass when applicable.
* [ ] No unnecessary dependencies were introduced.
* [ ] Documentation was updated.
* [ ] Final Git diff was reviewed.

---

## 9. Pull Request Handoff

Before creating or updating the PR, provide a concise summary:

```text
Task:
Jira:

Implemented:
- ...

Files changed:
- ...

Business rules:
- RN-XXX

Tests:
- ...

Documentation:
- ...

Known limitations:
- ...

Unrelated changes:
- None
```

The PR must contain only changes related to the assigned task.

---

## 10. Scope Protection

If the AI notices an improvement outside the assigned task:

> **Do not implement it.**

Create a recommendation instead:

```text
Potential future task:
Description:
Reason:
Suggested priority:
```

The purpose of this rule is to ensure that every Pull Request has a clear and reviewable scope.

---

## 11. Completion

The Backend task is considered ready for review only when:

```text
Development
     ↓
Tests
     ↓
Documentation
     ↓
Diff review
     ↓
Pull Request
```

The AI must not mark a task as complete merely because the code compiles.
