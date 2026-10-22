import { AuthZResource } from 'lib/authz/hooks/useAuthZ/types';

import {
	ANY_RESOURCE_VALUE,
	ParsedSelector,
	QUERY_TYPES,
	QueryTypeId,
	QueryTypeOption,
	SelectorDraft,
	SelectorValidation,
	SUPPORTED_GRANT_KEY,
} from './TelemetrySelectorWizard.constants';

const METRIC_RESOURCES: ReadonlySet<AuthZResource> = new Set<AuthZResource>([
	'metrics',
	'meter-metrics',
]);

export function getQueryTypeOption(
	queryType: string,
): QueryTypeOption | undefined {
	return QUERY_TYPES.find((option) => option.id === queryType);
}

export function isQueryTypeAvailable(
	option: QueryTypeOption,
	resource: AuthZResource,
): boolean {
	return !option.metricsOnly || METRIC_RESOURCES.has(resource);
}

export function supportsKeyScoping(queryType: string): boolean {
	return getQueryTypeOption(queryType)?.supportsKeyScoping ?? false;
}

export function isAnyResourceValue(value: string): boolean {
	return value.trim() === ANY_RESOURCE_VALUE;
}

function splitSelector(selector: string): string[] {
	const parts = selector.split('/');

	if (parts.length <= 3) {
		return parts;
	}

	return [parts[0], parts[1], parts.slice(2).join('/')];
}

export function buildSelector({ queryType, value }: SelectorDraft): string {
	const trimmedValue = value.trim();

	if (!supportsKeyScoping(queryType) || !trimmedValue) {
		return `${queryType}/${ANY_RESOURCE_VALUE}`;
	}

	return `${queryType}/${SUPPORTED_GRANT_KEY}/${trimmedValue}`;
}

export function parseSelector(selector: string): ParsedSelector {
	const parts = splitSelector(selector.trim());

	return {
		queryType: getQueryTypeOption(parts[0])?.id,
		value: parts.length >= 3 ? parts[2] : '',
	};
}

/**
 * This does a basic validation, intentionally omitting deep validations since this is to be made at backend,
 * so this will allow to produce invalid selectors, and the validation will be done after the user try to save
 */
export function validateSelector(selector: string): SelectorValidation {
	const trimmed = selector.trim();

	if (!trimmed) {
		return { message: 'Enter a selector.', isError: true };
	}

	if (trimmed === ANY_RESOURCE_VALUE) {
		return { message: 'Allow every query of every type.', isError: false };
	}

	const parts = splitSelector(trimmed);
	const option = getQueryTypeOption(parts[0]);

	if (!option) {
		return {
			message: `"${parts[0]}" is not a supported query type.`,
			isError: true,
		};
	}

	if (parts.length < 3) {
		if (parts.length === 2 && parts[1] !== ANY_RESOURCE_VALUE) {
			if (!option.supportsKeyScoping) {
				return {
					message: `This query type does not support key scoping. Use ${option.id}/*`,
					isError: false, // intentionally not an error
				};
			}

			return {
				message: `Use <query-type>/${ANY_RESOURCE_VALUE} or <query-type>/${SUPPORTED_GRANT_KEY}/<value>.`,
				isError: false, // intentionally not an error
			};
		}

		return {
			message: `Allow every "${option.label}" query.`,
			isError: false,
		};
	}

	const [, key, value] = parts;

	if (value === ANY_RESOURCE_VALUE) {
		return {
			message: `Allow every ${key} for ${option.label} queries.`,
			isError: false,
		};
	}

	if (!option.supportsKeyScoping) {
		return {
			message: `This query type does not support key scoping. Use ${option.id}/*`,
			isError: false, // intentionally not an error
		};
	}

	return {
		message: `Allow ${key}=${value} for ${option.label} queries.`,
		isError: false,
	};
}

export function getDefaultSelector(queryType: QueryTypeId): string {
	return buildSelector({ queryType, value: '' });
}
