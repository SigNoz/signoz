import type { BadgeColorType } from '@signozhq/ui/badge';
import { InframonitoringtypesNodeConditionDTO } from 'api/generated/services/sigNoz.schemas';

export const NODE_CONDITION_COLORS: Record<
	InframonitoringtypesNodeConditionDTO,
	BadgeColorType
> = {
	[InframonitoringtypesNodeConditionDTO.ready]: 'success',
	[InframonitoringtypesNodeConditionDTO.not_ready]: 'warning',
	[InframonitoringtypesNodeConditionDTO.no_data]: 'secondary',
};

export const NODE_CONDITION_LABELS: Record<
	InframonitoringtypesNodeConditionDTO,
	string
> = {
	[InframonitoringtypesNodeConditionDTO.ready]: 'Ready',
	[InframonitoringtypesNodeConditionDTO.not_ready]: 'Not Ready',
	[InframonitoringtypesNodeConditionDTO.no_data]: 'No Data',
};
