---

name: vice-city-testing-workflow
description: Use this skill when testing or reviewing functionality in Vice City. The AI must test only the assigned task, verify acceptance criteria and business rules, document evidence, and provide a clear Pull Request recommendation.
---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

# Vice City Testing & QA Workflow

## Purpose

Define how AI agents must test functionality developed for Vice City.

The Testing agent must work **exclusively on the assigned Jira task or Pull Request**.

Its purpose is to determine whether the implemented functionality satisfies the requirements and whether the Pull Request is ready to be accepted.

---

## 1. Task Isolation

The Testing agent must only test functionality related to the assigned task.

Before testing, identify:

* Jira task.
* Related User Story.
* Acceptance criteria.
* Business rules.
* Files changed by the Pull Request.
* Functionality implemented.

### Mandatory rule

> **Do not test or modify unrelated functionality unless it is necessary to verify an impact caused by the assigned change.**

If an unrelated problem is discovered, document it instead of modifying the code.

```text
Unrelated issue detected

Location:
Problem:
Evidence:
Suggested future task:
```

---

## 2. Required Context

Before testing, read:

1. `AGENTS.md`.
2. Relevant project skills.
3. `vice-city-business-rules`.
4. Assigned Jira task.
5. Pull Request description.
6. Files changed by the PR.
7. Existing tests.
8. Relevant documentation.

The Testing agent must understand what the developer was actually asked to implement before judging the result.

---

## 3. Acceptance Criteria

Every acceptance criterion must be verified individually.

Example:

```text
Acceptance Criteria

[PASS] User can create a reservation.
[PASS] Invalid service is rejected.
[PASS] Capacity is validated.
[FAIL] Reservation is confirmed without payment.
```

Do not mark a criterion as passed without evidence.

---

## 4. Business Rules

Verify that the implementation respects the relevant business rules.

Examples:

* Reservation limits.
* Availability.
* Capacity.
* Payment rules.
* Discounts.
* Maintenance.
* QR validity.
* Employee permissions.
* POS rules.
* Historical pricing.

If the implementation conflicts with a business rule, report it clearly.

---

## 5. Testing Strategy

Depending on the functionality, test:

### Happy Path

Verify the expected successful flow.

### Validation

Test:

* Missing fields.
* Invalid values.
* Incorrect formats.
* Invalid IDs.
* Unauthorized requests.

### Edge Cases

Test relevant boundaries.

Examples:

```text
15 days before reservation
1 second before slot
Slot already started
Slot already finished
Capacity exactly reached
Capacity exceeded
Payment timeout
```

### Error Handling

Verify that failures produce an appropriate response and do not leave inconsistent data.

### Security

When applicable, verify:

* Authentication.
* Authorization.
* Role permissions.
* Access to protected resources.
* Input validation.

---

## 6. Backend Testing

For Backend functionality, verify:

* API endpoints.
* HTTP methods.
* Request validation.
* Response structure.
* HTTP status codes.
* Business logic.
* Database interactions.
* Error handling.
* Authorization.

Do not modify Backend code while performing QA unless explicitly requested.

The Testing agent is a reviewer, not the implementer.

---

## 7. Frontend Testing

When the assigned task includes Frontend functionality, verify:

* Rendering.
* User interaction.
* Form validation.
* Loading states.
* Error states.
* Success states.
* Responsive behavior.
* Navigation.
* API integration.

---

## 8. Regression Testing

Regression testing should be limited to functionality that could reasonably be affected by the assigned change.

Do not test the entire application unnecessarily.

Example:

If the task modifies reservation availability:

```text
Test:
✓ Reservation creation
✓ Availability calculation
✓ Capacity validation
✓ Conflicting reservations

Do not unnecessarily test:
✗ Admin reports
✗ Landing page
✗ Authentication UI
```

---

## 9. Documentation

The Testing agent must update or create the appropriate testing documentation/README.

The documentation should contain:

```md
# QA Report

Jira: HUXXB

## Functionality tested

...

## Acceptance criteria

- [x] Criterion 1
- [x] Criterion 2
- [ ] Criterion 3

## Tests executed

### Test 1

Scenario:
Steps:
Expected:
Actual:
Result:

### Test 2

Scenario:
Steps:
Expected:
Actual:
Result:

## Business rules verified

- RN-XXX
- RN-XXX

## Evidence

- Logs:
- Screenshots:
- Test output:

## Problems found

- ...

## Recommendation

APPROVE / CHANGES REQUESTED
```

---

## 10. Evidence

Whenever possible, testing should leave verifiable evidence.

Examples:

* Test output.
* API response.
* HTTP status.
* Console output.
* Screenshots.
* Logs.
* Automated test results.

Do not claim that a test passed without actually performing it.

---

## 11. Pull Request Review

The Testing agent must inspect the final Git diff.

Verify:

* Changes correspond to the assigned task.
* No unrelated functionality was modified.
* Acceptance criteria are satisfied.
* Relevant business rules are respected.
* Tests pass.
* Documentation exists.
* No obvious regression was introduced.

---

## 12. Final Recommendation

The Testing agent must provide one of two final recommendations.

### APPROVE

Use only when:

* Acceptance criteria pass.
* Relevant business rules pass.
* Tests pass.
* No blocking issues are found.
* Changes remain within task scope.

Example:

```text
QA RESULT: APPROVE

The functionality satisfies the acceptance criteria.
Relevant business rules were verified.
Tests passed.
No blocking issues were found.
No unrelated changes were detected.
```

### CHANGES REQUESTED

Use when:

* An acceptance criterion fails.
* A business rule is violated.
* A test fails.
* A blocking error exists.
* An important regression is detected.
* The PR contains unrelated implementation changes.

Example:

```text
QA RESULT: CHANGES REQUESTED

Blocking issues:

1. [HUXXB] Reservation can exceed service capacity.
   Expected:
   Actual:
   Evidence:

2. [HUXXB] Payment failure does not release the reservation hold.
   Expected:
   Actual:
   Evidence:
```

---

## 13. Important Rule

The Testing agent must **not fix the problems it discovers** unless the assigned task explicitly asks it to implement the correction.

Its responsibility is:

```text
Read
 ↓
Understand
 ↓
Test
 ↓
Verify
 ↓
Document
 ↓
Approve / Request Changes
```

Not:

```text
Read
 ↓
Test
 ↓
Modify developer code
```

---

## 14. Handoff

The QA documentation must be sufficient for another developer or AI agent to understand:

* What was tested.
* What passed.
* What failed.
* Why it failed.
* Which requirement was affected.
* Which business rule was affected.
* What evidence exists.
* Whether the PR should be accepted.

The report becomes part of the Pull Request review process.
