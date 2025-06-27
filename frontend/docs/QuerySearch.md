# QuerySearch Component Documentation

## Overview
The QuerySearch component is a sophisticated query builder interface that allows users to construct complex search queries with real-time validation and autocomplete functionality.

## Dependencies
```typescript
// Core UI
import { Card, Collapse, Space, Tag, Typography } from 'antd';

// Code Editor
import {
    autocompletion,
    CompletionContext,
    CompletionResult,
    startCompletion,
} from '@codemirror/autocomplete';
import { javascript } from '@codemirror/lang-javascript';
import { ViewPlugin, ViewUpdate } from '@codemirror/view';
import { copilot } from '@uiw/codemirror-theme-copilot';
import CodeMirror, { EditorView, Extension } from '@uiw/react-codemirror';

// Custom Hooks and Utilities
import { useGetQueryKeySuggestions } from 'hooks/querySuggestions/useGetQueryKeySuggestions';
import { getValueSuggestions } from 'api/querySuggestions/getValueSuggestion';
import { queryOperatorSuggestions, validateQuery } from 'utils/antlrQueryUtils';
import { getQueryContextAtCursor } from 'utils/queryContextUtils';
```

## Key Features
1. Real-time query validation
2. Context-aware autocompletion
3. Support for various query operators (=, !=, IN, LIKE, etc.)
4. Support for complex conditions with AND/OR operators
5. Support for functions (HAS, HASANY, HASALL)
6. Support for parentheses and nested conditions
7. Query examples for common use cases

## State Management
```typescript
const [query, setQuery] = useState<string>('');
const [valueSuggestions, setValueSuggestions] = useState<any[]>([]);
const [activeKey, setActiveKey] = useState<string>('');
const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
const [queryContext, setQueryContext] = useState<IQueryContext | null>(null);
const [validation, setValidation] = useState<IValidationResult>({...});
const [editingMode, setEditingMode] = useState<'key' | 'operator' | 'value' | 'conjunction' | 'function' | 'parenthesis' | 'bracketList' | null>(null);
```

## Core Functions

### 1. Autocomplete Handler
```typescript
function myCompletions(context: CompletionContext): CompletionResult | null {
    // Handles autocomplete suggestions based on context
    // Supports different contexts: key, operator, value, function, etc.
}
```

### 2. Value Suggestions Fetcher
```typescript
const fetchValueSuggestions = useCallback(
    async (key: string): Promise<void> => {
        // Fetches value suggestions for a given key
        // Handles loading states and error cases
    },
    [activeKey, isLoadingSuggestions],
);
```

### 3. Query Change Handler
```typescript
const handleQueryChange = useCallback(async (newQuery: string) => {
    // Updates query and validates it
    // Handles validation errors
}, []);
```

## Query Context Types
1. Key context: When editing a field name
2. Operator context: When selecting an operator
3. Value context: When entering a value
4. Conjunction context: When using AND/OR
5. Function context: When using functions
6. Parenthesis context: When using parentheses
7. Bracket list context: When using IN operator

## Example Queries
```typescript
const queryExamples = [
    { label: 'Basic Query', query: "status = 'error'" },
    { label: 'Multiple Conditions', query: "status = 'error' AND service = 'frontend'" },
    { label: 'IN Operator', query: "status IN ['error', 'warning']" },
    { label: 'Function Usage', query: "HAS(service, 'frontend')" },
    { label: 'Numeric Comparison', query: 'duration > 1000' },
    // ... more examples
];
```

## Performance Optimizations
1. Uses `useCallback` for memoized functions
2. Tracks component mount state to prevent updates after unmount
3. Debounces suggestion fetching
4. Caches key suggestions

## Error Handling
```typescript
try {
    const validationResponse = validateQuery(newQuery);
    setValidation(validationResponse);
} catch (error) {
    setValidation({
        isValid: false,
        message: 'Failed to process query',
        errors: [error as IDetailedError],
    });
}
```

## Usage Example
```typescript
<QuerySearch />
```

## Styling
- Uses SCSS for styling
- Custom classes for different components
- Theme integration with CodeMirror

## Best Practices
1. Always validate queries before submission
2. Handle loading states appropriately
3. Provide clear error messages
4. Use appropriate operators for different data types
5. Consider performance implications of complex queries

## Common Issues and Solutions
1. Query validation errors
   - Check syntax and operator usage
   - Verify data types match operator requirements
2. Performance issues
   - Optimize suggestion fetching
   - Cache frequently used values
3. UI/UX issues
   - Ensure clear error messages
   - Provide helpful suggestions
   - Show appropriate loading states

## Future Improvements
1. Add more query examples
2. Enhance error messages
3. Improve performance for large datasets
4. Add more operator support
5. Enhance UI/UX features 