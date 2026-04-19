# Testing

This document provides rules for writing tests that catch real bugs and do not become a maintenance burden. It covers both how to write good tests and how to recognize bad ones.

## Why we write tests

Tests exist to give confidence that the system behaves correctly. A good test suite lets you change code and know immediately (or in a reasonable time) whether you broke something. A bad test suite lets you change code (and then spend hours figuring out whether the failures are real) and still lets the bugs slip in.

Every test should be written to answer one question: **if this test fails, does that mean a user-visible behavior is broken?** If the answer is no, reconsider whether the test should exist.

Not all tests are equal. Different scopes serve different purposes, and the balance matters.

- **Unit tests**: Fast, focused, test a single function or type in isolation. These form the foundation. They should run in milliseconds, have no I/O, and be fully deterministic.
- **Integration tests**: Verify that components work together against real dependencies (ClickHouse, PostgreSQL, etc.). Slower, but catch problems that unit tests cannot: real query behavior, configuration issues, serialization mismatches.
- **End-to-end tests**: Validate full system behavior from the outside. Expensive to write and maintain, but necessary for critical user flows.

When a test can be written at a smaller scope, prefer the smaller scope. But do not force a unit test where an integration test is the natural fit.

## What to test

### Test behaviors, not implementations

A test should verify what the code does, not how it does it (unless the goal of the test is specifically how something happen). If you can refactor the internals of a function e.g, change a query, rename a variable, restructure the logic and no user-visible behavior changes, no test should break.

```go
// Good: tests the behavior "given this input, expect this output."
func TestDiscountApplied(t *testing.T) {
    order := NewOrder(item("widget", 100))
    order.ApplyDiscount(10)
    assert.Equal(t, 90, order.Total())
}

// Bad: tests the implementation "did it call the right internal method?"
func TestDiscountApplied(t *testing.T) {
    mockPricer := new(MockPricer)
    mockPricer.On("CalculateDiscount", 100, 10).Return(90)
    order := NewOrder(item("widget", 100), WithPricer(mockPricer))
    order.ApplyDiscount(10)
    mockPricer.AssertCalled(t, "CalculateDiscount", 100, 10)
}
```

The first test survives a refactoring of how discounts are calculated. The second test breaks the moment you rename the method, change its signature, or inline the logic.

**The refactoring test**: before committing a test, ask if someone refactors the internals tomorrow without changing any behavior, will this test break? If yes, consider updating the test.

### Output format as behavior

Some functions exist specifically to produce a formatted output: a query builder generates SQL, a serializer generates JSON, a code generator produces source code. In these cases, the output string *is* the behavior and asserting on it is valid and necessary. The function's contract is the exact output it produces.

This is different from testing a function that *uses* a query internally. If a function's job is to fetch data from a database, the query it sends is an implementation detail and the returned data is the behavior. If its job is to *build* a query for someone else to execute, the query string is the behavior.

The distinction: **is the formatted output the function's product, or the function's mechanism?** Test the product, not the mechanism.

### Test at the public API boundary

Write tests against the exported functions and methods that consumers actually call. Do not test unexported helpers directly. If an unexported function has complex logic worth testing, that is a signal it should be extracted into its own package with its own public API.

### Test edge cases and error paths

The most valuable tests cover the cases that are easy to get wrong:

- Empty inputs, nil inputs, zero values.
- Boundary conditions (off-by-one, first element, last element).
- Error conditions (what happens when the dependency fails?).
- Concurrent access, if the code is designed for it.

A test for the happy path of a trivial function adds little value. A test for the error path of a complex function prevents real bugs.

### The Beyonce Rule

"If you liked it, then you should have put a test on it." Any behavior you want to preserve such as correctness, performance characteristics, security constraints, error handling should be covered by a test. If it breaks and there is no test, that is not a regression; it is an untested assumption.

## How to write a test

### Structure: arrange, act, assert

Every test should have three clearly separated sections:

```go
func TestTransferInsufficientFunds(t *testing.T) {
    // Arrange: set up the preconditions.
    from := NewAccount(50)
    to := NewAccount(0)

    // Act: perform the operation being tested.
    err := Transfer(from, to, 100)

    // Assert: verify the outcome.
    require.Error(t, err)
    assert.Equal(t, 50, from.Balance())
    assert.Equal(t, 0, to.Balance())
}
```

Do not interleave setup and assertions. Do not put assertions in helper functions that also perform setup. Keep the three sections visually distinct.

### One behavior per test

Each test function should verify one behavior. If a test name needs "and" in it, split it into two tests.

```go
// Good: one behavior per test.
func TestParseValidInput(t *testing.T) { ... }
func TestParseEmptyInput(t *testing.T) { ... }
func TestParseMalformedInput(t *testing.T) { ... }

// Bad: multiple behaviors in one test.
func TestParse(t *testing.T) {
    // test valid input
    // test empty input
    // test malformed input
}
```

Table-driven tests are fine when the behavior is the same and only the inputs/outputs vary.

### Name tests after behaviors

Test names should describe the scenario and the expected outcome, not the function being tested.

```go
// Good: describes the behavior.
func TestWithdrawal_InsufficientFunds_ReturnsError(t *testing.T)
func TestWithdrawal_ZeroBalance_ReturnsError(t *testing.T)

// Bad: describes the function.
func TestWithdraw(t *testing.T)
func TestWithdrawError(t *testing.T)
```

### Eliminate logic in tests

Tests should be straight-line code. No `if`, no `for`, no `switch`. If you feel the need to add control flow to a test, either split it into multiple tests or restructure the test data.

A test with logic in it needs its own tests. That is a sign something has gone wrong.

### Write clear failure messages

When a test fails, the failure message should tell you what went wrong without reading the test source.

```go
// Good: failure message explains the context.
assert.Equal(t, expected, actual, "discount should be applied to order total")

// Bad: failure message is just the default.
assert.Equal(t, expected, actual)
```

Use `require` for preconditions that must hold for the rest of the test to make sense. Use `assert` for the actual verifications. This avoids cascading failures from a single root cause.

## How to recognize a bad test

A bad test costs more to maintain than the bugs it prevents. Learning to identify bad tests is as important as learning to write good ones. Always evaluate a test critically before commiting it.

### Tests that duplicate the implementation

If a test contains the same logic as the code it tests, it verifies nothing. It will pass when the code is wrong in the same way the test is wrong, and it will break whenever the code changes even if the change is correct.

A common form: mocking a database, setting up canned rows, calling a function that queries and scans those rows, then asserting that the function returned exactly those rows. The test encodes the query, the row structure, and the scan logic. The same things the production code does. If the function has no branching logic beyond "query and scan," this test is a mirror of the implementation, not a check on it. An integration test against a real database verifies the actual behavior; the mock-based test verifies that the code matches the test author's expectations of the code.

### Tests for functions with no interesting logic

Not every function needs a test. A function that prepares a query, sends it, and scans the result has no branching, no edge cases, and no logic that could be wrong independently of the query being correct. Unit-testing it means mocking the database, which means the test does not verify the query works. It only verifies the function calls the mock in the expected way.

Ask: **what bug would this test catch that would not be caught by the integration test or by the tests of the calling code?** If the answer is nothing, skip the unit test. A missing test is better than a test that provides false confidence.

### Tests that rebuild the dependency boundary

When a test creates an in-package mock of an external interface (database driver, HTTP client, file system) and that mock contains non-trivial logic (reflection-based scanning, response simulation, state machines), the test is now testing its own mock as much as the production code. Bugs in the mock produce false passes or false failures, and the mock must be maintained alongside the real dependency.

If the mock is complex enough to have its own bugs, you have rebuilt the dependency boundary rather than testing against it. Use the real dependency (via integration test) or use a well-maintained fake provided by the dependency's authors.

### Tests that exist for coverage

A test that exercises a function without meaningfully verifying its output adds coverage without adding confidence. Calling a type-conversion function with every numeric type and asserting it does not panic covers lines but does not catch regressions. The function would need to be rewritten to fail, and any such rewrite would be caught by the callers' tests.

Before writing a test, identify the specific failure mode it guards against. If you cannot name one, the test is not worth writing.

### Tests that test the language

Do not test that language type system, standard library, or well-known third-party libraries work correctly. Testing that `reflect.Kind` returns the right value for each type, that pointer dereferencing works, or that a type switch dispatches correctly adds maintenance burden without catching any plausible bug in your code.

## Brittle tests

A brittle test is one that fails when production code changes without an actual bug being introduced. Brittle tests are expensive: they slow down development, train people to ignore failures, and provide no real safety net. Common sources of brittleness:

- **Asserting on implementation details**: Verifying which internal methods were called, in what order, or with what intermediate values. If the method is renamed or the order changes but the output is the same, the test breaks for no reason.
- **Asserting on serialized representations when the format is not the contract**: Matching exact SQL strings, JSON output, or log messages produced by a function whose job is not to produce that format.
- **Over-constrained mocks**: Setting up a mock that expects specific arguments in a specific sequence. Any refactoring of the call pattern breaks the mock setup even if behavior is preserved.
- **Shared mutable state**: Tests that depend on data left behind by other tests. A change in execution order or a new test case causes unrelated failures.
- **Time-dependence**: Tests that use `time.Now()`, `time.Sleep()`, or real timers. These produce flaky results and break under load.

When you encounter a brittle test, fix or delete it. Do not work around it.

## DAMP

Test code should prioritize clarity (DAMP: Descriptive And Meaningful Phrases).

```go
// DAMP: each test is self-contained and readable.
func TestCreateUser(t *testing.T) {
    user := User{Name: "Alice", Email: "alice@example.com"}
    err := store.Create(ctx, user)
    require.NoError(t, err)
}

func TestCreateDuplicateUser(t *testing.T) {
    user := User{Name: "Alice", Email: "alice@example.com"}
    _ = store.Create(ctx, user)
    err := store.Create(ctx, user)
    assert.ErrorIs(t, err, ErrAlreadyExists)
}
```

Shared setup helpers are fine for constructing objects with sensible defaults. But each test should explicitly set the values it depends on rather than relying on hidden defaults in a shared fixture.

## Flaky tests

A flaky test is one that sometimes passes and sometimes fails without any code change. Flaky tests erode trust in the entire suite. Once people learn to re-run and ignore failures, real bugs slip through.

Common causes and fixes:

- **Timing and sleeps**: Replace `time.Sleep` with channels, condition variables, or polling with a timeout.
- **Uncontrolled concurrency**: Use deterministic synchronization rather than relying on goroutine scheduling.
- **Shared state between tests**: Each test should set up and tear down its own state.

If a test is flaky and you cannot fix the root cause quickly, skip or delete it. A skipped test with an explanation is better than a flaky test that trains everyone to ignore red builds.

## Code coverage

Code coverage measures which lines were executed, not whether the code is correct. A function that is called but whose output is never checked has 100% coverage and 0% verification.

Do not use coverage as a target to hit. Use it as a tool to find gaps such as untested error paths, unreachable branches, dead code. A codebase with 60% meaningful coverage is better than one with 95% coverage achieved by testing trivial getters.

## Tests are code

Tests must be maintained and they are not second-class citizen. You should apply the same standards for readability, naming, and structure that you apply to production code. We do not tolerate complexity in tests just because they are tests.

However, tests should be simpler than production code. If a test requires its own helper library, complex setup, or nested control flow, step back and ask whether you are testing the right thing at the right level. This is not a blanket rule but a prompt to pause, assess the situation, and check whether the complexity is justified.

## What should I remember?

- If refactoring internals breaks your test but no behavior changed, the test is likely bad. Delete it or consider updating it.
- Test what the code does, not how it does it. Verify outputs and state, not method calls.
- Output format is behavior when the function's job is to produce that format. It is not behavior when the function uses it internally.
- Ask what specific bug this test catches. If you cannot name one, do not write it.
- Always evaluate whether the test adds confidence, not just lines.
- One behavior per test. Name it after the scenario, not the function.
- No logic in tests. Straight-line code only.
- Flaky tests are not acceptable. Fix the root cause or nuke the test code.
- Coverage measures execution, not correctness.

## Mandatory reading

- What to look for in a code review: Tests - https://google.github.io/eng-practices/review/reviewer/looking-for.html#tests
- Testing Overview - https://abseil.io/resources/swe-book/html/ch11.html
- Unit Testing - https://abseil.io/resources/swe-book/html/ch12.html
- Test Doubles - https://abseil.io/resources/swe-book/html/ch13.html
- Larger Testing - https://abseil.io/resources/swe-book/html/ch14.html
