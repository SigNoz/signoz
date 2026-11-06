import { TelemetrytypesFieldContextDTO } from 'api/generated/services/sigNoz.schemas';
import type { TagFilter } from 'types/api/queryBuilder/queryBuilderData';

// Legacy filter builders read `tag` / `resource`; any other context is a top-level field there.
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

export const fieldContextToAttributeType = (fieldContext?: string): string =>
	(fieldContext && FIELD_CONTEXT_TO_ATTRIBUTE_TYPE[fieldContext]) || '';

export const attributeTypeToFieldContext = (
	type?: string | null,
): TelemetrytypesFieldContextDTO | undefined =>
	type ? ATTRIBUTE_TYPE_TO_FIELD_CONTEXT[type] : undefined;

export const toLegacyTagFilter = (filter: TagFilter): TagFilter =>
	filter && {
		...filter,
		items: (filter.items ?? []).map((item) => ({
			...item,
			key: item.key && {
				...item.key,
				type: FIELD_CONTEXT_TO_ATTRIBUTE_TYPE[item.key.type ?? ''] ?? item.key.type,
			},
		})),
	};
