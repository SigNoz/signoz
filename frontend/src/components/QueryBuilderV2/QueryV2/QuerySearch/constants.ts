export const RECENTS_SECTION = { name: 'Recent searches', rank: 1 } as const;
export const SUGGESTIONS_SECTION = { name: 'Suggestions', rank: 2 } as const;

// Custom CodeMirror Completion.type for recent-query entries. Used to discriminate
// recents from regular autocomplete completions in renderers and event handlers.
export const RECENT_COMPLETION_TYPE = 'recent';

// Max number of recents rendered in the autocomplete dropdown.
//  Do change $max-recents-shown: in QuerySearch.styles.scss if you change this.
export const RECENTS_DISPLAY_CAP = 5;

export const queryExamples = [
	{
		label: 'Basic Query',
		query: "status = 'error'",
		description: 'Find all errors',
	},
	{
		label: 'Multiple Conditions',
		query: "status = 'error' AND service = 'frontend'",
		description: 'Find errors from frontend service',
	},
	{
		label: 'IN Operator',
		query: "status IN ['error', 'warning']",
		description: 'Find items with specific statuses',
	},
	{
		label: 'Function Usage',
		query: "HAS(service, 'frontend')",
		description: 'Use HAS function',
	},
	{
		label: 'Numeric Comparison',
		query: 'duration > 1000',
		description: 'Find items with duration greater than 1000ms',
	},
	{
		label: 'Range Query',
		query: 'duration BETWEEN 100 AND 1000',
		description: 'Find items with duration between 100ms and 1000ms',
	},
	{
		label: 'Pattern Matching',
		query: "service LIKE 'front%'",
		description: 'Find services starting with "front"',
	},
	{
		label: 'Complex Conditions',
		query: "(status = 'error' OR status = 'warning') AND service = 'frontend'",
		description: 'Find errors or warnings from frontend service',
	},
	{
		label: 'Multiple Functions',
		query: "HAS(service, 'frontend') AND HAS(status, 'error')",
		description: 'Use multiple HAS functions',
	},
	{
		label: 'NOT Operator',
		query: "NOT status = 'success'",
		description: 'Find items that are not successful',
	},
	{
		label: 'Array Contains',
		query: "tags CONTAINS 'production'",
		description: 'Find items with production tag',
	},
	{
		label: 'Regex Pattern',
		query: "service REGEXP '^prod-.*'",
		description: 'Find services matching regex pattern',
	},
	{
		label: 'Null Check',
		query: 'error IS NULL',
		description: 'Find items without errors',
	},
	{
		label: 'Multiple Attributes',
		query:
			"service = 'frontend' AND environment = 'production' AND status = 'error'",
		description: 'Find production frontend errors',
	},
	{
		label: 'Nested Conditions',
		query:
			"(service = 'frontend' OR service = 'backend') AND (status = 'error' OR status = 'warning')",
		description: 'Find errors or warnings from frontend or backend',
	},
];
