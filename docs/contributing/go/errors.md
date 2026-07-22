# Errors

SigNoz includes its own structured [errors](/pkg/errors/errors.go) package. It's built on top of Go's `error` interface, extending it to add additional context that helps provide more meaningful error messages throughout the application.

## How to use it?

To use the SigNoz structured errors package, use these functions instead of the standard library alternatives:

```go
// Instead of errors.New()
errors.New(typ, code, message)

// Instead of fmt.Errorf()
errors.Newf(typ, code, message, args...)
```

### Typ
The Typ (read as Type, defined as `typ`) is used to categorize errors across the codebase and is loosely coupled with HTTP/GRPC status codes. All predefined types can be found in [pkg/errors/type.go](/pkg/errors/type.go). For example:

- `TypeInvalidInput` - Indicates invalid input was provided
- `TypeNotFound` - Indicates a resource was not found

By design, `typ` is unexported and cannot be declared outside of [errors](/pkg/errors/errors.go) package. This ensures that it is consistent across the codebase and is used in a way that is meaningful.

### Code
Codes are used to provide more granular categorization within types. For instance, a type of `TypeInvalidInput` might have codes like `CodeInvalidEmail` or `CodeInvalidPassword`.

To create new error codes, use the `errors.MustNewCode` function:

```go
var (
    CodeThingAlreadyExists = errors.MustNewCode("thing_already_exists")
    CodeThingNotFound = errors.MustNewCode("thing_not_found")
)
```

> 💡 **Note**: Error codes must match the regex `^[a-z_]+$` otherwise the code will panic.

### Message
The primary, human-readable summary of what went wrong, set when the error is created via `errors.New` / `errors.Newf`. Note there are two distinct `message` fields in the response: this top-level one states the overall failure, while each entry under [Additional](#additional) carries its own [message](#message-1) explaining one specific facet of it.

### Url
An optional link to documentation that explains the error in more depth, set with `WithUrl`. It is left empty when the error has no associated doc.

```go
return errors.New(errors.TypeInvalidInput, CodeBadThing, "bad thing").
    WithUrl("https://signoz.io/docs/...")
```

### Additional
`errors` is a list of supplementary details that explain the top-level `message`. Each entry has its own `message` and `suggestions`, so a single error can surface several distinct problems individually. Attach details with `WithAdditional` (message only) or `WithSuggestiveAdditional` (message plus the suggestions that belong to it):

#### Message
A single, self-contained sentence describing one specific facet of the error (e.g. ``field `filed` not found``), distinct from the top-level [Message](#message). Prefer one detail per distinct problem over concatenating several into one message.

#### Suggestions
The suggestions tied to that specific detail — typically a ``did you mean: `x` `` correction for the value the detail is about. These are distinct from the error-wide [Suggestions](#suggestions) below: detail-scoped suggestions never leak into the top-level list.

```go
return errors.NewInvalidInputf(errors.CodeInvalidInput, "unknown field %q", field).
    WithAdditional("field `field` not found")
return errors.NewInvalidInputf(errors.CodeInvalidInput, "unknown field %q", field).
    WithSuggestiveAdditional("field `filed` not found", "did you mean: `field`")
```

### Retry
Carries the `delay` the client should wait before retrying, set with `WithRetryAfter`. It is `null` when the error is not retryable.

```go
return errors.NewTimeoutf(CodeSlow, "upstream timed out").
    WithRetryAfter(5 * time.Second)
```

### Suggestions
`WithSuggestions` sets the error-wide `suggestions` list — hints about the error as a whole (e.g. "narrow the time range window"), as opposed to suggestions tied to a single detail. Prefer the builders in [pkg/errors/suggestions.go](/pkg/errors/suggestions.go) over hand-writing the strings so the phrasing stays consistent:

- `NewSuggestionsOnLevenshteinDistance(invalidInput, noun, validInputs)` — returns a ``did you mean: `x` `` correction (when a close typo match exists) followed by the valid-references list.
- `NewValidReferences(noun, values...)` — formats a capped list as ``valid <noun> are `a`, `b` `` (e.g. `"valid fields are"`, `"valid keys are"`). Returns `""` for an empty set.
- `NewSuggestionsFromFunc(produce)` — wraps a caller-computed correction string as a one-element ``did you mean: `x` `` slice (or nil when it returns `""`), for callers with their own matching strategy.

`noun` names the kind of value being suggested. Use one of the exported `Noun*` constants (`errors.NounFields`, `errors.NounKeys`, `errors.NounServices`, …) so the wording stays uniform across the codebase.

```go
return errors.NewInvalidInputf(errors.CodeInvalidInput, "unknown field %q", field).
    WithSuggestions(errors.NewSuggestionsOnLevenshteinDistance(field, errors.NounFields, validFields)...)
```

## Show me some examples

### Using the error
A basic example of using the error:

```go
var (
    CodeThingAlreadyExists = errors.MustNewCode("thing_already_exists")
)

func CreateThing(id string) error {
  t, err := thing.GetFromStore(id)
  if err != nil {
    if errors.As(err, errors.TypeNotFound) {
        // thing was not found, create it
        return thing.Create(id)
    }

    // something else went wrong, wrap the error with more context
    return errors.Wrapf(err, errors.TypeInternal, errors.CodeUnknown, "failed to get thing from store")
  }

  return errors.Newf(errors.TypeAlreadyExists, CodeThingAlreadyExists, "thing with id %s already exists", id)
}
```

### Changing the error
Sometimes you may want to change the error while preserving the message:

```go
func GetUserSecurely(id string) (*User, error) {
    user, err := repository.GetUser(id)
    if err != nil {
        if errors.Ast(err, errors.TypeNotFound) {
            // Convert NotFound to Forbidden for security reasons
            return nil, errors.New(errors.TypeForbidden, errors.CodeAccessDenied, "access denied to requested resource")
        }
        return nil, err
    }
    return user, nil
}
```

## Why do we need this?

In a large codebase like SigNoz, error handling is critical for maintaining reliability, debuggability, and a good user experience. We believe that it is the **responsibility of a function** to return **well-defined** errors that **accurately describe what went wrong**. With our structured error system:

- Functions can create precise errors with appropriate additional context
- Callers can make informed decisions based on the additional context
- Error context is preserved and enhanced as it moves up the call stack

The caller (which can be another function or a HTTP/gRPC handler or something else entirely), can then choose to use this error to take appropriate actions such as:

- A function can branch into different paths based on the context
- An HTTP/gRPC handler can derive the correct status code and message from the error and send it to the client
- Logging systems can capture structured error information for better diagnostics

Although there might be cases where this might seem too verbose, it makes the code more maintainable and consistent. A little verbose code is better than clever code that doesn't provide enough context.

## What should I remember?

- Think about error handling as you write your code, not as an afterthought.
- Always use the [errors](/pkg/errors/errors.go) package instead of the standard library's `errors.New()` or `fmt.Errorf()`.
- Always assign appropriate codes to errors when creating them instead of using the "catch all" error codes defined in [pkg/errors/code.go](/pkg/errors/code.go).
- Use `errors.Wrapf()` to add context to errors while preserving the original when appropriate.
