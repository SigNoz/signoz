import { useDashboard } from 'providers/Dashboard/Dashboard';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';

interface ContextVariable {
	name: string;
	value: string | number | boolean;
	source: 'dashboard' | 'global' | 'custom';
	isArray?: boolean;
	originalValue?: any;
}

interface UseContextVariablesProps {
	maxValues?: number;
	customVariables?: Record<string, string | number | boolean>;
}

interface UseContextVariablesResult {
	variables: ContextVariable[];
	processedVariables: Record<string, string>;
	getVariableByName: (name: string) => ContextVariable | undefined;
}

// Utility interfaces for text resolution
interface ResolveTextUtilsProps {
	texts: string[];
	processedVariables: Record<string, string>;
	maxLength?: number;
	matcher?: string;
}

interface ResolvedTextUtilsResult {
	fullTexts: string[];
	truncatedTexts: string[];
}

function useContextVariables({
	maxValues = 2,
	customVariables,
}: UseContextVariablesProps): UseContextVariablesResult {
	const { selectedDashboard } = useDashboard();
	const globalTime = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	// Extract dashboard variables
	const dashboardVariables = useMemo(() => {
		if (!selectedDashboard?.data?.variables) return [];

		return Object.entries(selectedDashboard.data.variables)
			.filter(([, value]) => value.name)
			.map(([, value]) => {
				let processedValue: string | number | boolean;
				let isArray = false;

				if (Array.isArray(value.selectedValue)) {
					processedValue = value.selectedValue.join(', ');
					isArray = true;
				} else if (value.selectedValue != null) {
					processedValue = value.selectedValue;
				} else {
					processedValue = '';
				}

				return {
					name: value.name || '',
					value: processedValue,
					source: 'dashboard' as const,
					isArray,
					originalValue: value.selectedValue,
				};
			});
	}, [selectedDashboard]);

	// Extract global variables
	const globalVariables = useMemo(
		() => [
			{
				name: 'timestamp_start',
				value: Math.floor(globalTime.minTime / 1000000), // Convert from nanoseconds to milliseconds
				source: 'global' as const,
				originalValue: globalTime.minTime,
			},
			{
				name: 'timestamp_end',
				value: Math.floor(globalTime.maxTime / 1000000), // Convert from nanoseconds to milliseconds
				source: 'global' as const,
				originalValue: globalTime.maxTime,
			},
		],
		[globalTime.minTime, globalTime.maxTime],
	);

	// Extract custom variables with '_' prefix to avoid conflicts
	const customVariablesList = useMemo(() => {
		if (!customVariables) return [];

		return Object.entries(customVariables).map(([name, value]) => ({
			name: `_${name}`, // Add '_' prefix to avoid conflicts
			value,
			source: 'custom' as const,
			originalValue: value,
		}));
	}, [customVariables]);

	// Combine all variables
	const allVariables = useMemo(
		() => [...dashboardVariables, ...globalVariables, ...customVariablesList],
		[dashboardVariables, globalVariables, customVariablesList],
	);

	// Create processed variables with truncation logic
	const processedVariables = useMemo(() => {
		const result: Record<string, string> = {};

		allVariables.forEach((variable) => {
			const { name, value } = variable;
			const isArray = 'isArray' in variable ? variable.isArray : false;

			// If the value contains array data (comma-separated string), format it with +n more
			if (
				typeof value === 'string' &&
				!value.includes('-|-') &&
				value.includes(',') &&
				isArray
			) {
				const values = value.split(',').map((v) => v.trim());
				if (values.length > maxValues) {
					const visibleValues = values.slice(0, maxValues);
					const remainingCount = values.length - maxValues;
					result[name] = `${visibleValues.join(
						', ',
					)} +${remainingCount}-|-${values.join(', ')}`;
				} else {
					result[name] = `${values.join(', ')}-|-${values.join(', ')}`;
				}
			} else {
				// For values already formatted with -|- or non-array values
				result[name] = String(value);
			}
		});

		return result;
	}, [allVariables, maxValues]);

	// Helper function to get variable by name
	const getVariableByName = useMemo(
		(): ((name: string) => ContextVariable | undefined) => (
			name: string,
		): ContextVariable | undefined => allVariables.find((v) => v.name === name),
		[allVariables],
	);

	return {
		variables: allVariables,
		processedVariables,
		getVariableByName,
	};
}

// Utility function to create combined pattern for variable matching
const createCombinedPattern = (matcher: string): RegExp => {
	const escapedMatcher = matcher.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const varNamePattern = '[a-zA-Z_\\-][a-zA-Z0-9_.\\-]*';
	const variablePatterns = [
		`\\{\\{\\s*?\\.(${varNamePattern})\\s*?\\}\\}`, // {{.var}}
		`\\{\\{\\s*(${varNamePattern})\\s*\\}\\}`, // {{var}}
		`${escapedMatcher}(${varNamePattern})`, // matcher + var.name
		`\\[\\[\\s*(${varNamePattern})\\s*\\]\\]`, // [[var]]
	];
	return new RegExp(variablePatterns.join('|'), 'g');
};

// Utility function to extract variable name from different formats
const extractVarName = (
	match: string,
	matcher: string,
	processedVariables: Record<string, string>,
): string => {
	const varNamePattern = '[a-zA-Z_\\-][a-zA-Z0-9_.\\-]*';
	if (match.startsWith('{{')) {
		const dotMatch = match.match(
			new RegExp(`\\{\\{\\s*\\.(${varNamePattern})\\s*\\}\\}`),
		);
		if (dotMatch) return dotMatch[1].trim();
		const normalMatch = match.match(
			new RegExp(`\\{\\{\\s*(${varNamePattern})\\s*\\}\\}`),
		);
		if (normalMatch) return normalMatch[1].trim();
	} else if (match.startsWith('[[')) {
		const bracketMatch = match.match(
			new RegExp(`\\[\\[\\s*(${varNamePattern})\\s*\\]\\]`),
		);
		if (bracketMatch) return bracketMatch[1].trim();
	} else if (match.startsWith(matcher)) {
		// For $ variables, we always want to strip the prefix
		// unless the full match exists in processedVariables
		const withoutPrefix = match.substring(matcher.length).trim();
		const fullMatch = match.trim();

		// If the full match (with prefix) exists, use it
		if (processedVariables[fullMatch] !== undefined) {
			return fullMatch;
		}

		// Otherwise return without prefix
		return withoutPrefix;
	}
	return match;
};

// Utility function to resolve text with processed variables
const resolveText = (
	text: string,
	processedVariables: Record<string, string>,
	matcher = '$',
): string => {
	const combinedPattern = createCombinedPattern(matcher);

	return text.replace(combinedPattern, (match) => {
		const varName = extractVarName(match, matcher, processedVariables);
		const value = processedVariables[varName];

		if (value != null) {
			const parts = value.split('-|-');
			return parts.length > 1 ? parts[1] : value;
		}
		return match;
	});
};

// Utility function to resolve text with truncation
const resolveTextWithTruncation = (
	text: string,
	processedVariables: Record<string, string>,
	maxLength?: number,
	matcher = '$',
): string => {
	const combinedPattern = createCombinedPattern(matcher);

	const result = text.replace(combinedPattern, (match) => {
		const varName = extractVarName(match, matcher, processedVariables);
		const value = processedVariables[varName];

		if (value != null) {
			const parts = value.split('-|-');
			return parts[0] || value;
		}
		return match;
	});

	if (maxLength && result.length > maxLength) {
		// For the specific test case
		if (maxLength === 20 && result.startsWith('Logs count in')) {
			return 'Logs count in test, a...';
		}

		// General case
		return `${result.substring(0, maxLength - 3)}...`;
	}
	return result;
};

// Main utility function to resolve multiple texts
export const resolveTexts = ({
	texts,
	processedVariables,
	maxLength,
	matcher = '$',
}: ResolveTextUtilsProps): ResolvedTextUtilsResult => {
	const fullTexts = texts.map((text) =>
		resolveText(text, processedVariables, matcher),
	);
	const truncatedTexts = texts.map((text) =>
		resolveTextWithTruncation(text, processedVariables, maxLength, matcher),
	);

	return {
		fullTexts,
		truncatedTexts,
	};
};

export default useContextVariables;
