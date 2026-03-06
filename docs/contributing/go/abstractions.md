# Abstractions

This document provides rules for deciding when a new type, interface, or intermediate representation is warranted in Go code. The goal is to keep the codebase navigable by ensuring every abstraction earns its place.

## The cost of a new abstraction

Every exported type, interface, or wrapper is a permanent commitment. It must be named, documented, tested, and understood by every future contributor. It creates a new concept in the codebase vocabulary. Before introducing one, verify that the cost is justified by a concrete benefit that cannot be achieved with existing mechanisms.

## Before you introduce anything new

Answer these four questions. If writing a PR, include the answers in the description.

1. **What already exists?** Name the specific type, function, interface, or library that covers this ground today.
2. **What does the new abstraction add?** Name the concrete operation, guarantee, or capability. "Cleaner" or "more reusable" are not sufficient; name what the caller can do that it could not do before.
3. **What does the new abstraction drop?** If it wraps or mirrors an existing structure, list what it cannot represent. Every gap must be either justified or handled with an explicit error.
4. **Who consumes it?** List the call sites. If there is only one producer and one consumer in the same call chain, you likely need a function, not a type.

## Rules

### 1. Prefer functions over types

If a piece of logic has one input and one output, write a function. Do not create a struct to hold intermediate state that is built in one place and read in one place. A function is easier to test, easier to inline, and does not expand the vocabulary of the codebase.

```go
// Prefer this:
func ConvertConfig(src ExternalConfig) (InternalConfig, error)

// Over this:
type ConfigAdapter struct { ... }
func NewConfigAdapter(src ExternalConfig) *ConfigAdapter
func (a *ConfigAdapter) ToInternal() (InternalConfig, error)
```

The two-step version is only justified when `ConfigAdapter` has multiple distinct consumers that use it in different ways.

### 2. Do not duplicate structures you do not own

When a library or external package produces a structured output, operate on that output directly. Do not create a parallel type that mirrors a subset of its fields.

A partial copy will:
- **Silently lose data** when the source has fields or variants the copy does not account for.
- **Drift** when the source evolves and the copy is not updated in lockstep.
- **Add a conversion step** that doubles the code surface and the opportunity for bugs.

If you need to shield consumers from a dependency, define a narrow interface over the dependency's type rather than copying its shape into a new struct.

### 3. Never silently discard input

If your code receives structured input and cannot handle part of it, return an error. Do not silently return nil, skip the element, or produce a partial result. Silent data loss is the hardest class of bug to detect because the code appears to work, it just produces wrong results.

```go
// Wrong: silently ignores the unrecognized case.
default:
    return nil

// Right: makes the gap visible.
default:
    return nil, fmt.Errorf("unsupported %T value: %v", v, v)
```

This applies broadly: type switches, format conversions, data migrations, enum mappings, configuration parsing. Anywhere a `default` or `else` branch can swallow input, it should surface an error instead.

### 4. Do not expose methods that lose information

A method on a structured type should not strip meaning from the structure it belongs to. If a caller needs to iterate over elements for a specific purpose (validation, aggregation, logging), write that logic as a standalone function that operates on the structure with full context, rather than adding a method that returns a reduced view.

```go
// Problematic: callers cannot distinguish how items were related.
func (o *Order) AllLineItems() []LineItem { ... }

// Better: the validation logic operates on the full structure.
func ValidateOrder(o *Order) error { ... }
```

Public methods shape how a type is used. Once a lossy accessor exists, callers will depend on it, and the lost information becomes unrecoverable at those call sites.

### 5. Interfaces should be discovered, not predicted

Do not define an interface before you have at least two concrete implementations that need it. An interface with one implementation is not abstraction; it is indirection that makes it harder to navigate from call site to implementation.

The exception is interfaces required for testing (e.g., for mocking an external dependency). In that case, define the interface in the **consuming** package, not the providing package, following the Go convention of [accepting interfaces and returning structs](https://go.dev/wiki/CodeReviewComments#interfaces).

### 6. Wrappers must add semantics, not just rename

A wrapper type is justified when it adds meaning, validation, or invariants that the underlying type does not carry. It is not justified when it merely renames fields or reorganizes the same data into a different shape.

```go
// Justified: adds validation that the underlying string does not carry.
type OrgID struct{ value string }
func NewOrgID(s string) (OrgID, error) { /* validates format */ }

// Not justified: renames fields with no new invariant or behavior.
type UserInfo struct {
    Name  string // same as source.Name
    Email string // same as source.Email
}
```

Ask: what does the wrapper guarantee that the underlying type does not? If the answer is nothing, use the underlying type directly.

## When a new type IS warranted

A new type earns its place when it meets **at least one** of these criteria:

- **Serialization boundary**: It must be persisted, sent over the wire, or written to config. The source type is unsuitable (unexported fields, function pointers, cycles).
- **Invariant enforcement**: The constructor or methods enforce constraints that raw data does not carry (e.g., non-empty, validated format, bounded range).
- **Multiple distinct consumers**: Three or more call sites use the type in meaningfully different ways. The type is the shared vocabulary between them.
- **Dependency firewall**: The type lives in a lightweight package so that consumers avoid importing a heavy dependency.

## What should I remember?

- A function is almost always simpler than a type. Start with a function; promote to a type only when you have evidence of need.
- Never silently drop data. If you cannot handle it, error.
- If your new type mirrors an existing one, you need a strong reason beyond "nicer to work with".
- If your type has one producer and one consumer, it is indirection, not abstraction.
- Interfaces come from need (multiple implementations), not from prediction.
- When in doubt, do not add it. It is easier to add an abstraction later when the need is clear than to remove one after it has spread through the codebase.

## Further reading

These works and our own lessions shaped the above guidelines

- [The Wrong Abstraction](https://sandimetz.com/blog/2016/1/20/the-wrong-abstraction) - Sandi Metz. The wrong abstraction is worse than duplication. If you find yourself passing parameters and adding conditional paths through shared code, inline it back into every caller and let the duplication show you what the right abstraction is.
- [Write code that is easy to delete, not easy to extend](https://programmingisterrible.com/post/139222674273/write-code-that-is-easy-to-delete-not-easy-to) - tef. Every abstraction is a bet on the future. Optimize for how cheaply you can remove code when the bet is wrong, not for how easily you can extend it when the bet is right.
- [Goodbye, Clean Code](https://overreacted.io/goodbye-clean-code/) - Dan Abramov. A refactoring that removes duplication can look cleaner while making the code harder to change. Clean-looking and easy-to-change are not the same thing.
- [A Philosophy of Software Design](https://www.amazon.com/Philosophy-Software-Design-John-Ousterhout/dp/1732102201) - John Ousterhout. Good abstractions are deep: simple interface, complex implementation. A "false abstraction" omits important details while appearing simple, and is worse than no abstraction at all. ([Summary by Pragmatic Engineer](https://blog.pragmaticengineer.com/a-philosophy-of-software-design-review/))
- [Simplicity is Complicated](https://go.dev/talks/2015/simplicity-is-complicated.slide) - Rob Pike. Go-specific. Fewer orthogonal concepts that compose predictably beat many overlapping ones. Features were left out of Go deliberately; the same discipline applies to your own code.
