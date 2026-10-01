import type { DashboardtypesScatterPlotDimensionsDTO } from 'api/generated/services/sigNoz.schemas';

import type { SectionEditorContext } from '../../sectionContext';
import { joinSummary } from '../../utils/summary';

export function summarizeDimensions(
	value: DashboardtypesScatterPlotDimensionsDTO | undefined,
	_controls: unknown,
	{ tableColumns = [] }: SectionEditorContext,
): string {
	const labelOf = (key: string | undefined): string | undefined =>
		key
			? (tableColumns.find((column) => column.key === key)?.label ?? key)
			: undefined;
	const x = labelOf(value?.x);
	const y = labelOf(value?.y);
	const size = labelOf(value?.size);
	return joinSummary([
		x || y ? `${x ?? 'auto'} vs ${y ?? 'auto'}` : 'Auto',
		size && `sized by ${size}`,
		(value?.color?.length ?? 0) > 0 && `coloured by ${value?.color?.join(', ')}`,
	]);
}
