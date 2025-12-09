import { InfoCircleOutlined } from '@ant-design/icons';
import { SelectProps, Tooltip } from 'antd';
import { DefaultOptionType } from 'antd/es/select';
import { TelemetryFieldKey } from 'api/v5/v5';
import { AxiosResponse } from 'axios';
import { ReactNode } from 'react';
import {
	QueryKeyDataSuggestionsProps,
	QueryKeySuggestionsResponseProps,
} from 'types/api/querySuggestions/types';

import { ColumnTitleIcon, ColumnTitleWrapper } from './styles';

/**
 * Extracts all available keys from API response and transforms them into TelemetryFieldKey format
 * @param keysData - The response data from useGetQueryKeySuggestions hook
 * @returns Array of TelemetryFieldKey objects
 */
export const extractTelemetryFieldKeys = (
	keysData?: AxiosResponse<QueryKeySuggestionsResponseProps>,
): TelemetryFieldKey[] => {
	const keysList = Object.values(keysData?.data?.data?.keys || {})?.flat() || [];
	return keysList.map((key) => ({
		name: key.name,
		fieldDataType: key.fieldDataType,
		fieldContext: key.fieldContext,
		signal: key.signal,
	})) as TelemetryFieldKey[];
};

/**
 * Creates a unique key for a column by combining context, name, and dataType
 * Format: fieldContext::name::fieldDataType
 * Example: "attribute::http.status_code::number"
 */
export const getUniqueColumnKey = (
	column: TelemetryFieldKey | QueryKeyDataSuggestionsProps,
): string => {
	const name = column.name || '';
	const dataType =
		('fieldDataType' in column && column.fieldDataType) ||
		('dataType' in column && column.dataType) ||
		'string';
	const context =
		column.fieldContext || ('type' in column && column.type) || 'attribute';
	return `${context}::${name}::${dataType}`;
};

/**
 * Parses a unique column key back into its components
 * Format: fieldContext::name::fieldDataType
 */
export const parseColumnKey = (
	key: string,
): { name: string; fieldDataType: string; fieldContext: string } => {
	const parts = key.split('::');
	const fieldContext = parts[0] || 'attribute';
	const name = parts[1] || '';
	const fieldDataType = parts[2] || 'string';
	return { name, fieldDataType, fieldContext };
};

/**
 * Creates a count map of how many variants each attribute name has
 * Used to determine which columns should display badges
 */
export const getVariantCounts = <T extends { name?: string }>(
	items: T[],
): Record<string, number> => {
	if (!items || !items.length) return {};
	return items.reduce((acc: Record<string, number>, item: T) => {
		const name = item?.name || '';
		if (name) {
			acc[name] = (acc[name] || 0) + 1;
		}
		return acc;
	}, {} as Record<string, number>);
};

/**
 * Extracts a Set of column names that have multiple variants from options
 * Useful when options already have hasMultipleVariants flag
 */
export const getNamesWithVariants = (
	options: SelectProps['options'],
): Set<string> => {
	if (!options || !Array.isArray(options)) return new Set();
	const names = options
		.filter((opt) => {
			if (!opt) return false;
			const option = opt as DefaultOptionType & {
				hasMultipleVariants?: boolean;
			};
			return option?.hasMultipleVariants;
		})
		.map((opt) => {
			if (!opt) return '';
			const value = String(opt.value || '');
			return parseColumnKey(value).name;
		});
	return new Set(names);
};

/**
 * Groups fields by their name to analyze variants
 * Returns a map of field name to array of fields with that name
 */
export const getFieldVariantsByName = <T extends { name?: string }>(
	fields: T[],
): Record<string, T[]> =>
	fields.reduce((acc, field) => {
		const name = field.name || '';
		if (!acc[name]) {
			acc[name] = [];
		}
		acc[name].push(field);
		return acc;
	}, {} as Record<string, T[]>);

/**
 * Determines the column title based on variant analysis
 * Shows context if dataTypes are same but contexts differ
 * Shows dataType if dataTypes differ
 */
export const getColumnTitle = <
	T extends Partial<QueryKeyDataSuggestionsProps> | Partial<TelemetryFieldKey>
>(
	field: T,
	hasVariants: boolean,
	variants: T[],
	// eslint-disable-next-line sonarjs/cognitive-complexity
): string => {
	const name = field.name || '';
	if (!hasVariants) return name;

	// Extract data types from variants (support both fieldDataType and dataType)
	const uniqueDataTypes = new Set(
		variants
			.map(
				(v) =>
					('fieldDataType' in v && v.fieldDataType) ||
					('dataType' in v && v.dataType),
			)
			.filter(Boolean),
	);

	// Extract contexts from variants (support both fieldContext and type)
	const uniqueContexts = new Set(
		variants
			.map(
				(v) => ('fieldContext' in v && v.fieldContext) || ('type' in v && v.type),
			)
			.filter(Boolean),
	);

	// Same dataType but different contexts - show context
	if (
		uniqueDataTypes.size === 1 &&
		uniqueContexts.size > 1 &&
		(field.fieldContext || ('type' in field && field.type))
	) {
		return `${name} (${field.fieldContext || ('type' in field && field.type)})`;
	}

	// Different dataTypes - show dataType
	const dataType = 'fieldDataType' in field && field.fieldDataType;
	if (dataType) {
		return `${name} (${dataType})`;
	}

	return name;
};

/**
 * Checks if another field with the same name but different unique key exists in availableKeys
 * This indicates a conflicted column scenario
 */
const hasConflictingField = <
	T extends Partial<QueryKeyDataSuggestionsProps> | Partial<TelemetryFieldKey>
>(
	field: T,
	availableKeys?: TelemetryFieldKey[],
): boolean => {
	if (!availableKeys || availableKeys.length === 0) return false;

	const fieldName = field.name || '';
	const fieldUniqueKey = getUniqueColumnKey(field as TelemetryFieldKey);

	return availableKeys.some(
		(key) => key.name === fieldName && getUniqueColumnKey(key) !== fieldUniqueKey,
	);
};

/**
 * Returns column title as ReactNode with tooltip icon if conflicting field exists
 * Shows tooltip when another field with the same name but different type/context exists
 */
export const getColumnTitleWithTooltip = <
	T extends Partial<QueryKeyDataSuggestionsProps> | Partial<TelemetryFieldKey>
>(
	field: T,
	hasVariants: boolean,
	variants: T[],
	selectedColumns: TelemetryFieldKey[],
	availableKeys?: TelemetryFieldKey[],
): ReactNode => {
	const title = getColumnTitle(field, hasVariants, variants);
	const hasConflict = hasConflictingField(field, availableKeys);

	if (hasConflict) {
		return (
			<ColumnTitleWrapper>
				{title}
				<Tooltip title="The same column with a different type or context exists">
					<ColumnTitleIcon>
						<InfoCircleOutlined />
					</ColumnTitleIcon>
				</Tooltip>
			</ColumnTitleWrapper>
		);
	}

	return title;
};

export const getOptionsFromKeys = (
	keys: TelemetryFieldKey[],
	selectedKeys: (string | undefined)[],
): SelectProps['options'] => {
	// Detect which attribute names have multiple variants
	const nameCounts = keys.reduce((acc, key) => {
		const name = key.name || '';
		acc[name] = (acc[name] || 0) + 1;
		return acc;
	}, {} as Record<string, number>);

	const options = keys.map((key) => ({
		label: key.name,
		value: getUniqueColumnKey(key),
		// Store additional data for rendering
		fieldDataType: key.fieldDataType,
		fieldContext: key.fieldContext,
		signal: key.signal,
		hasMultipleVariants: nameCounts[key.name || ''] > 1,
	}));

	return options.filter(
		({ value }) => !selectedKeys.find((selectedKey) => selectedKey === value),
	);
};

/**
 * Determines if a column name has multiple variants
 * Checks both selected columns and available keys (from search) to detect conflicts
 * Reuses getVariantCounts for consistency
 */
export const hasMultipleVariants = (
	columnName: string,
	selectedColumns: TelemetryFieldKey[],
	availableKeys?: TelemetryFieldKey[],
): boolean => {
	// Combine selected columns with available keys (if provided)
	const allKeys = availableKeys
		? [...selectedColumns, ...availableKeys]
		: selectedColumns;

	// Deduplicate by unique key to avoid counting same variant twice
	const uniqueKeysMap = new Map<string, TelemetryFieldKey>();
	allKeys.forEach((key) => {
		const uniqueKey = getUniqueColumnKey(key);
		if (!uniqueKeysMap.has(uniqueKey)) {
			uniqueKeysMap.set(uniqueKey, key);
		}
	});

	const deduplicatedKeys = Array.from(uniqueKeysMap.values());
	const variantCounts = getVariantCounts(deduplicatedKeys);

	return variantCounts[columnName] > 1;
};
