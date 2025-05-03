# Error

SigNoz includes its own [errors](/pkg/errors/errors.go) package. It's built on top of Go's `error` interface, extending it to add additional context that helps provide more meaningful error messages throughout the application.

## How to use it?

To use the SigNoz error type, use these functions instead of the standard library alternatives:

```go
// Instead of errors.New()
errors.New(type, code, message)

// Instead of fmt.Errorf()
errors.Newf(type, code, message, args...)
```

### Type
The Type is used to categorize errors across the codebase and is loosely coupled with HTTP/GRPC status codes. All predefined types can be found in [pkg/errors/type.go](/pkg/errors/type.go). For example:

- `TypeInvalidInput` - Indicates invalid input was provided
- `TypeNotFound` - Indicates a resource was not found

Type cannot be defined outside of [errors](/pkg/errors/errors.go) package by design. This ensures that the type is consistent across the codebase and is used in a way that is meaningful and consistent.

### Code
Codes are used to provide more granular categorization within types. For instance, a type of TypeInvalidInput might have codes like CodeInvalidEmail or CodeInvalidPassword.

To create new error codes, use the `errors.MustNewCode` function:

```go
var (
    CodeThingAlreadyExists = errors.MustNewCode("thing_already_exists")
    CodeThingNotFound = errors.MustNewCode("thing_not_found")
)
```

> 💡 **Note**: Error codes must match the regex `^[a-z_]+$` otherwise the code will panic.

### Examples

#### Using the error
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

#### Changing error types
Sometimes you may want to change the error type while preserving the message:

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

In a large codebase like SigNoz, error handling is critical for maintaining reliability, debuggability, and a good user experience. It is the **responsibility of a function** to return **well-defined** errors that **accurately describe what went wrong**. With our structured error system:

- Functions can create precise errors with appropriate types and codes
- Callers can make informed decisions based on error types
- Error context is preserved and enhanced as it moves up the call stack

Either the caller of the function or, in the case of HTTP/gRPC endpoints, the handler, can then choose to use this error to take appropriate action:

- A function can wrap this error and add more context to it
- An HTTP/gRPC handler can derive the correct status code from the error type and send it to the client
- Logging systems can capture structured error information for better diagnostics

Although there might be cases where this might seem too verbose, it makes the code more maintainable and consistent. A little verbose code is better than clever code that is hard to maintain.


## What should I remember?

- Think about error handling as you write your code, not as an afterthought.
- Always use the [errors](/pkg/errors/errors.go) package instead of the standard library's `errors.New()` or `fmt.Errorf()`.
- Always assign appropriate codes to errors when creating them instead of using the "catch all" error codes defined in [pkg/errors/code.go](/pkg/errors/code.go).
- Use `errors.Wrapf()` to add context to errors while preserving the original interface when appropriate.
