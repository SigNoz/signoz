import { BadgeColor } from '@signozhq/ui/badge';
import {
	InframonitoringtypesContainerStatusDTO,
	InframonitoringtypesNodeConditionDTO,
	InframonitoringtypesPodStatusDTO,
} from 'api/generated/services/sigNoz.schemas';
import { OptionData } from 'components/NewSelect/types';

import {
	FILTERABLE_CONTAINER_STATUSES,
	FILTERABLE_NODE_CONDITIONS,
	FILTERABLE_POD_STATUSES,
} from '../../../hooks';
import { POD_STATUS_COLORS, POD_STATUS_LABELS } from '../../../commonUtils';
import {
	CONTAINER_STATUS_COLORS,
	CONTAINER_STATUS_LABELS,
} from '../../../Containers/utils';
import { NODE_CONDITION_LABELS } from '../../../Nodes/utils';

const ERROR_BADGE_COLOR: BadgeColor = 'cherry';

/**
 * Splits statuses into the two sections the dropdown renders. The badge colour is
 * already the severity signal in the table, so reusing it keeps the sections and
 * the status column from drifting apart.
 */
function toSectionedOptions<T extends string>(
	values: T[],
	labels: Record<T, string>,
	colors: Record<T, BadgeColor>,
): OptionData[] {
	const toOption = (value: T): OptionData => ({
		label: labels[value],
		value,
	});

	const lifecycle = values.filter(
		(value) => colors[value] !== ERROR_BADGE_COLOR,
	);
	const errors = values.filter((value) => colors[value] === ERROR_BADGE_COLOR);

	return [
		{ label: 'Lifecycle', options: lifecycle.map(toOption) },
		{ label: 'Error status', options: errors.map(toOption) },
	].filter((section) => section.options.length > 0);
}

export const POD_STATUS_FILTER_OPTIONS = toSectionedOptions(
	FILTERABLE_POD_STATUSES as InframonitoringtypesPodStatusDTO[],
	POD_STATUS_LABELS,
	POD_STATUS_COLORS,
);

export const CONTAINER_STATUS_FILTER_OPTIONS = toSectionedOptions(
	FILTERABLE_CONTAINER_STATUSES as InframonitoringtypesContainerStatusDTO[],
	CONTAINER_STATUS_LABELS,
	CONTAINER_STATUS_COLORS,
);

/** Only two values, so sections would add a heading per row. */
export const NODE_READINESS_FILTER_OPTIONS: OptionData[] = (
	FILTERABLE_NODE_CONDITIONS as InframonitoringtypesNodeConditionDTO[]
).map((value) => ({ label: NODE_CONDITION_LABELS[value], value }));
