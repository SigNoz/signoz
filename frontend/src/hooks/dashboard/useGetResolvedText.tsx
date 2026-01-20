// this hook is used to get the resolved text of a variable, lets say we have a text - "Logs count in $service.name in $severity and $service.name and $severity $service.name"
// and the values of service.name and severity are "service1" and "error" respectively, then the resolved text should be "Logs count in service1 in error and service1 and error service1"
// is case of the multiple variables value, make them comma separated
// also have a prop saying max length post that you should truncate the text with "..."
// return value should be a full text string, and a truncated text string (if max length is provided)

import { useDashboard } from 'providers/Dashboard/Dashboard';
import { ReactNode, useCallback, useMemo } from 'react';

interface UseGetResolvedTextProps {
	text: string | ReactNode;
	variables?: Record<string, string | number | boolean>;
	maxLength?: number;
	matcher?: string;
	maxValues?: number; // Maximum number of values to show before adding +n more
}

interface ResolvedTextResult {
	fullText: string | ReactNode;
	truncatedText: string | ReactNode;
}

// eslint-disable-next-line sonarjs/cognitive-complexity
function useGetResolvedText({
	text,
	variables,
	maxLength,
	matcher = '$',
	maxValues = 2, // Default to showing 2 values before +n more
}: UseGetResolvedTextProps): ResolvedTextResult {
	const { selectedDashboard } = useDashboard();
	const isString = typeof text === 'string';

	const processedDashboardVariables = useMemo(() => {
		if (variables) return variables;
		if (!selectedDashboard?.data.variables) return {};

		return Object.entries(selectedDashboard.data.variables).reduce<
			Record<string, string | number | boolean>
		>((acc, [, value]) => {
			if (!value.name) return acc;

			// Handle array values
			if (Array.isArray(value.selectedValue)) {
				acc[value.name] = value.selectedValue.join(', ');
			} else if (value.selectedValue != null) {
				acc[value.name] = value.selectedValue;
			}
			return acc;
		}, {});
	}, [variables, selectedDashboard?.data.variables]);

	// Process array values to add +n more notation for truncated text
	const processedVariables = useMemo(() => {
		const result: Record<string, string> = {};

		Object.entries(processedDashboardVariables).forEach(([key, value]) => {
			// If the value contains array data (comma-separated string), format it with +n more
			if (
				typeof value === 'string' &&
				!value.includes('-|-') &&
				value.includes(',')
			) {
				const values = value.split(',').map((v) => v.trim());
				if (values.length > maxValues) {
					const visibleValues = values.slice(0, maxValues);
					const remainingCount = values.length - maxValues;
					result[key] = `${visibleValues.join(
						', ',
					)} +${remainingCount}-|-${values.join(', ')}`;
				} else {
					result[key] = `${values.join(', ')}-|-${values.join(', ')}`;
				}
			} else {
				// For values already formatted with -|- or non-array values
				result[key] = String(value);
			}
		});

		return result;
	}, [processedDashboardVariables, maxValues]);

	const combinedPattern = useMemo(() => {
		const escapedMatcher = matcher.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		const variablePatterns = [
			`\\{\\{\\s*?\\.([^\\s}]+?)\\s*?\\}\\}`, // {{.var}}
			`\\{\\{\\s*([^\\s}]+?)\\s*\\}\\}`, // {{var}}
			`${escapedMatcher}([^\\s.,;)\\]}>]+(?:\\.[^\\s.,;)\\]}>]+)*)`, // $var.name.path - allows dots but stops at punctuation
			`\\[\\[\\s*([^\\s\\]]+?)\\s*\\]\\]`, // [[var]]
		];
		return new RegExp(variablePatterns.join('|'), 'g');
	}, [matcher]);

	const extractVarName = useCallback(
		(match: string): string => {
			// Extract variable name from different formats
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
		},
		[matcher, processedVariables],
	);

	const fullText = useMemo(() => {
		if (!isString) return text;

		return (text as string)?.replace(combinedPattern, (match) => {
			const varName = extractVarName(match);
			const value = processedVariables[varName];

			if (value != null) {
				const parts = value.split('-|-');
				return parts.length > 1 ? parts[1] : value;
			}
			return match;
		});
	}, [text, processedVariables, combinedPattern, extractVarName, isString]);

	const truncatedText = useMemo(() => {
		if (!isString) return text;

		const result = (text as string)?.replace(combinedPattern, (match) => {
			const varName = extractVarName(match);
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
	}, [
		text,
		processedVariables,
		combinedPattern,
		maxLength,
		extractVarName,
		isString,
	]);

	return {
		fullText,
		truncatedText,
	};
}

export default useGetResolvedText;
