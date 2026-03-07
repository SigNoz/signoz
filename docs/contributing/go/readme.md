# Go

This document provides an overview of contributing to the SigNoz backend written in Go. The SigNoz backend is built with Go, focusing on performance, maintainability, and developer experience. We strive for clean, idiomatic code that follows established Go practices while addressing the unique needs of an observability platform.

We adhere to three primary style guides as our foundation:

- [Effective Go](https://go.dev/doc/effective_go) - For writing idiomatic Go code
- [Code Review Comments](https://go.dev/wiki/CodeReviewComments) - For understanding common comments in code reviews
- [Google Style Guide](https://google.github.io/styleguide/go/) - Additional practices from Google

We **recommend** (almost enforce) reviewing these guides before contributing to the codebase. They provide valuable insights into writing idiomatic Go code and will help you understand our approach to backend development.

**Discover before inventing.** Before writing new code, search the codebase for existing solutions. SigNoz has established patterns for common problems: `pkg/valuer` for typed domain values, `pkg/errors` for structured errors, `pkg/factory` for provider wiring, `{pkg}test/` sub-packages for test helpers, and shared fixtures for integration tests. Duplicating what already exists creates drift and maintenance burden. When you find an existing pattern, use it. When you don't find one, check with the maintainers before building your own.

## How to approach a feature

Building a feature is not one task, it is a sequence of concerns that build on each other. Work through them in this order:

1. **Domain design (types).** Define the types that represent your domain. What are the entities, what are their relationships, what are the constraints? This is where you decide your data model. Get this right first because everything else depends on it. See [Packages](packages.md) and [Abstractions](abstractions.md).

2. **Structure (services / modules / handlers).** Place your code in the right layer given the current infrastructure. If the current structure does not work for your feature, that is the time to open a discussion and write a technical document, not to silently reshape things in the same PR. See [Handler](handler.md) and [Provider](provider.md).

3. **HTTP endpoints (paths, status codes, errors).** Pay close attention to detail here. Paths, methods, request/response shapes, status codes, error codes. These are the contract with consumers and are expensive to change after release. See [Endpoint](endpoint.md) and [Handler](handler.md).

4. **Database constraints (org_id, foreign keys, migrations).** Ensure org scoping, schema consistency, and migration correctness. See [SQL](sql.md).

5. **Business logic (module layer).** With the types, structure, endpoints, and storage in place, the focus narrows to the actual logic. This is where review should concentrate on correctness, edge cases, and error handling.

This ordering also gives you a natural way to split PRs. Each layer affects a different area and requires a different lens for review. A PR that mixes refactoring with new feature logic is hard to review and risky to ship. Separate them.

For large refactors or features that touch multiple subsystems, write a short technical document outlining the design and get relevant stakeholders aligned before starting implementation. This saves significant back-and-forth during review.

## Area-specific guides

In addition, we have a few additional rules that make certain areas stricter than the above which can be found in area-specific files in this package:

- [Abstractions](abstractions.md) - When to introduce new types and intermediate representations
- [Errors](errors.md) - Structured error handling
- [Endpoint](endpoint.md) - HTTP endpoint patterns
- [Flagger](flagger.md) - Feature flag patterns
- [Handler](handler.md) - HTTP handler patterns
- [Integration](integration.md) - Integration testing
- [Provider](provider.md) - Dependency injection and provider patterns
- [Packages](packages.md) - Naming, layout, and conventions for `pkg/` packages
- [Service](service.md) - Managed service lifecycle with `factory.Service`
- [SQL](sql.md) - Database and SQL patterns
- [Testing](testing.md) - Writing tests that catch bugs without becoming a maintenance burden
- [Types](types.md) - Type placement, naming variants, composition, and constructors
