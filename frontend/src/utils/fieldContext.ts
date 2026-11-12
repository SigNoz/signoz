import { TelemetrytypesFieldContextDTO } from 'api/generated/services/sigNoz.schemas';
import type { TagFilter } from 'types/api/queryBuilder/queryBuilderData';

const FIELD_CONTEXT_TO_ATTRIBUTE_TYPE: Record<string, string> = {
	[TelemetrytypesFieldContextDTO.attribute]: 'tag',
	[TelemetrytypesFieldContextDTO.resource]: 'resource',
};

const ATTRIBUTE_TYPE_TO_FIELD_CONTEXT: Record<
	string,
	TelemetrytypesFieldContextDTO
> = {
	tag: TelemetrytypesFieldContextDTO.attribute,
	attribute: TelemetrytypesFieldContextDTO.attribute,
	resource: TelemetrytypesFieldContextDTO.resource,
};

// The legacy logs builders read `tag` as attributes and an empty type as a top-level field;
// any other type falls through to resources.
const LEGACY_LOGS_KEY_TYPE: Record<string, string> = {
	[TelemetrytypesFieldContextDTO.attribute]: 'tag',
	tag: 'tag',
	[TelemetrytypesFieldContextDTO.resource]: 'resource',
	[TelemetrytypesFieldContextDTO.scope]: 'scope',
};

export const fieldContextToAttributeType = (fieldContext?: string): string =>
	(fieldContext && FIELD_CONTEXT_TO_ATTRIBUTE_TYPE[fieldContext]) || '';

export const attributeTypeToFieldContext = (
	type?: string | null,
): TelemetrytypesFieldContextDTO | undefined =>
	type ? ATTRIBUTE_TYPE_TO_FIELD_CONTEXT[type] : undefined;

export const toLegacyLogsFilter = (filter: TagFilter): TagFilter =>
	filter && {
		...filter,
		items: (filter.items ?? []).map((item) => ({
			...item,
			key: item.key && {
				...item.key,
				type: LEGACY_LOGS_KEY_TYPE[item.key.type ?? ''] ?? '',
			},
		})),
	};
