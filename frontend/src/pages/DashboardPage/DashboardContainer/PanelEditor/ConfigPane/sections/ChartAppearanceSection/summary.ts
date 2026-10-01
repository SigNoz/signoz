import {
	DashboardtypesFillModeDTO,
	DashboardtypesLineStyleDTO,
	type DashboardtypesScatterPlotPointsDTO,
} from 'api/generated/services/sigNoz.schemas';
import {
	resolvePointOpacity,
	resolvePointSize,
} from 'pages/DashboardPage/DashboardContainer/Panels/kinds/ScatterPlotPanel/points';
import type {
	PanelChartAppearanceSlice,
	SectionControlsOf,
	SectionKind,
} from 'pages/DashboardPage/DashboardContainer/Panels/types/sections';

import type { SectionEditorContext } from '../../sectionContext';
import { joinSummary } from '../../utils/summary';
import { FILL_MODE_OPTIONS, LINE_INTERPOLATION_OPTIONS } from './options';
import { formatOpacity, formatPointSize, formatPointSizeRange } from './utils';

function describePoints(
	points: DashboardtypesScatterPlotPointsDTO | undefined,
	sizeColumnLabel: string | undefined,
): string {
	const size = resolvePointSize(points);
	const dots = sizeColumnLabel
		? `${formatPointSizeRange([size.min, size.max])} dots`
		: `${formatPointSize(size.fixed)} dots`;
	return `${dots}, ${formatOpacity(resolvePointOpacity(points))}`;
}

function describeLine(value: PanelChartAppearanceSlice): string | undefined {
	const interpolation = LINE_INTERPOLATION_OPTIONS.find(
		(option) => option.value === value.lineInterpolation,
	)?.label;
	const dashed = value.lineStyle === DashboardtypesLineStyleDTO.dashed;
	if (!interpolation) {
		return dashed ? 'Dashed' : undefined;
	}
	return dashed ? `${interpolation}, dashed` : interpolation;
}

export function summarizeChartAppearance(
	value: PanelChartAppearanceSlice | undefined,
	controls: SectionControlsOf<SectionKind.ChartAppearance>,
	ctx: SectionEditorContext,
): string {
	const appearance = value ?? {};
	const fill = FILL_MODE_OPTIONS.find(
		(option) =>
			option.value === (appearance.fillMode ?? DashboardtypesFillModeDTO.none),
	);
	return joinSummary([
		(controls.lineStyle || controls.lineInterpolation) &&
			describeLine(appearance),
		controls.fillMode && fill && `${fill.label} fill`,
		controls.showPoints && appearance.showPoints && 'points',
		controls.spanGaps && appearance.spanGaps?.fillOnlyBelow && 'breaks gaps',
		controls.points && describePoints(appearance.points, ctx.sizeColumnLabel),
	]);
}
