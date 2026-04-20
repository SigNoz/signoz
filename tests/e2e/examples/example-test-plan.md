# Example Feature - Test Plan Template

## Application Overview

[Describe the feature/module being tested. Include key functionality, user flows, and important business logic.]

Example:
> The Routing Policies feature allows users to create, edit, and manage alert routing configurations. Users can define rules that determine how alerts are routed to different channels based on conditions like severity, labels, or alert names.

## Test Scenarios

### 1. [Main Scenario Category]

**Seed:** `tests/seed.spec.ts`

#### 1.1 [Specific Test Case]

**Pre-conditions:**
- User is logged in (handled by seed test)
- [Any other specific setup needed]

**Steps:**
1. Navigate to [specific page/section]
2. Click on [element description]
3. Fill in [field] with "[test data]"
4. Click [button/action]
5. Verify [expected outcome]

**Expected Results:**
- [Expected UI change or behavior]
- [Expected data state]
- [Expected navigation or feedback]

**Data:**
- Input field: "test value"
- Select option: "option name"

#### 1.2 [Another Test Case]

**Steps:**
1. ...

**Expected Results:**
- ...

### 2. [Another Scenario Category]

#### 2.1 [Test Case]

**Steps:**
1. ...

**Expected Results:**
- ...

## Edge Cases

### 3. Error Handling

#### 3.1 Invalid Input

**Steps:**
1. Enter invalid data
2. Attempt to submit

**Expected Results:**
- Error message displayed
- Form not submitted
- User remains on page

## Notes

- [Any special considerations]
- [Known limitations]
- [Areas requiring manual verification]

