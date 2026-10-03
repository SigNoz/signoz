import { BadgeColor } from '@signozhq/ui/badge';
import { InframonitoringtypesNodeConditionDTO } from 'api/generated/services/sigNoz.schemas';

export const NODE_CONDITION_COLORS: Record<
	InframonitoringtypesNodeConditionDTO,
	BadgeColor
> = {
	[InframonitoringtypesNodeConditionDTO.ready]: 'forest',
	[InframonitoringtypesNodeConditionDTO.not_ready]: 'amber',
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
