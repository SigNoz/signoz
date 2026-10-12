import { type ReactNode, useMemo } from 'react';
import type { PrecisionOption } from 'components/Graph/types';
import TooltipCard from 'lib/uPlotV2/components/Tooltip/components/TooltipCard/TooltipCard';

import type { PanelThreshold } from '../../../../types/threshold';
import type { TopListRow } from '../../types';
import { ACCENT_COLOR, getTooltipContent, resolveRowColors } from '../../utils';

interface TopListTooltipProps {
	row: TopListRow;
	/** What the values measure. */
	valueName: string;
	unit?: string;
	precision?: PrecisionOption;
	thresholds: PanelThreshold[];
	/** Bar color where no threshold recolours it; unset uses the accent. */
	barColor?: string;
	showShare: boolean;
	/** Hints for what a click does; none when rows aren't clickable. */
	footer?: ReactNode;
}

function TopListTooltip({
	row,
	valueName,
	unit,
	precision,
	thresholds,
	barColor,
	showShare,
	footer,
}: TopListTooltipProps): JSX.Element {
	const { rows, mutedRows } = useMemo(
		() => getTooltipContent(row, { valueName, unit, precision, showShare }),
		[row, valueName, unit, precision, showShare],
	);
	const colors = resolveRowColors(row.value, thresholds, unit, barColor);

	return (
		<TooltipCard
			title={row.label}
			color={colors.barColor ?? ACCENT_COLOR}
			rows={rows}
			mutedRows={mutedRows}
			footer={footer}
			testId="top-list-tooltip"
		/>
	);
}

export default TopListTooltip;
