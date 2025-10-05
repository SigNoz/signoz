# withErrorBoundary HOC

A Higher-Order Component (HOC) that wraps React components with ErrorBoundary to provide error handling and recovery.

## Features

- **Automatic Error Catching**: Catches JavaScript errors in any component tree
- **Integration**: Automatically reports errors with context
- **Custom Fallback UI**: Supports custom error fallback components
- **Error Logging**: Optional custom error handlers for additional logging
- **TypeScript Support**: Fully typed with proper generics
- **Component Context**: Automatically adds component name to tags

## Basic Usage

```tsx
import { withErrorBoundary } from 'components/HOC';

// Wrap any component
const SafeComponent = withErrorBoundary(MyComponent);

// Use it like any other component
<SafeComponent prop1="value1" prop2="value2" />
```

## Advanced Usage

### Custom Fallback Component

```tsx
const CustomFallback = () => (
  <div>
    <h3>Oops! Something went wrong</h3>
    <button onClick={() => window.location.reload()}>Reload</button>
  </div>
);

const SafeComponent = withErrorBoundary(MyComponent, {
  fallback: <CustomFallback />
});
```

### Custom Error Handler

```tsx
const SafeComponent = withErrorBoundary(MyComponent, {
  onError: (error, componentStack, eventId) => {
    console.error('Component error:', error);
    // Send to analytics, logging service, etc.
  }
});
```

### Sentry Configuration

```tsx
const SafeComponent = withErrorBoundary(MyComponent, {
  sentryOptions: {
    tags: {
      section: 'dashboard',
      priority: 'high',
      feature: 'metrics'
    },
    level: 'error'
  }
});
```

## API Reference

### `withErrorBoundary<P>(component, options?)`

#### Parameters

- `component: ComponentType<P>` - The React component to wrap
- `options?: WithErrorBoundaryOptions` - Configuration options

#### Options

```tsx
interface WithErrorBoundaryOptions {
  /** Custom fallback component to render when an error occurs */
  fallback?: ReactElement;
  
  /** Custom error handler function */
  onError?: (
    error: unknown,
    componentStack: string | undefined,
    eventId: string
  ) => void;
  
  /** Additional props to pass to the Sentry ErrorBoundary */
  sentryOptions?: {
    tags?: Record<string, string>;
    level?: Sentry.SeverityLevel;
  };
}
```

## When to Use

- **Critical Components**: Wrap important UI components that shouldn't crash the entire app
- **Third-party Integrations**: Wrap components that use external libraries
- **Data-heavy Components**: Wrap components that process complex data
- **Route Components**: Wrap page-level components to prevent navigation issues

## Best Practices

1. **Use Sparingly**: Don't wrap every component - focus on critical ones
2. **Meaningful Fallbacks**: Provide helpful fallback UI that guides users
3. **Log Errors**: Always implement error logging for debugging
4. **Component Names**: Ensure components have proper `displayName` for debugging
5. **Test Error Scenarios**: Test that your error boundaries work as expected

## Examples

See `withErrorBoundary.example.tsx` for complete usage examples.
