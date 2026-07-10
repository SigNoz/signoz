import {
	type KeyboardEvent as ReactKeyboardEvent,
	type MouseEvent as ReactMouseEvent,
} from 'react';
import type { DashboardtypesNumberPanelSpecDTO } from 'api/generated/services/sigNoz.schemas';
import { prepareScalarTables } from 'pages/DashboardPageV2/DashboardContainer/queryV5/prepareScalarTables';
import { getScalarResults } from 'pages/DashboardPageV2/DashboardContainer/queryV5/v5ResponseData';

import NoData from '../../components/NoData/NoData';
import PanelStyles from '../../panel.module.scss';
import { PanelRendererProps } from '../../types/rendererProps';
import { formatPanelValue } from '../../utils/formatPanelValue';
import { resolveDecimalPrecision } from '../../utils/chartAppearance/resolvers';
import { enrichNumberClick } from '../../utils/drilldown/enrichNumberClick';
import { getBuilderQueries } from '../../utils/getBuilderQueries';
import { getPanelTimeRange } from '../../utils/getPanelTimeRange';

import { prepareNumberData } from './prepareData';
import { mapNumberThresholds } from './utils';
import ValueDisplay from './components/ValueDisplay/ValueDisplay';

function NumberPanelRenderer({
	panel,
	data,
	isFetching,
	refetch,
	onClick,
	enableDrillDown,
}: PanelRendererProps<'signoz/NumberPanel'>): JSX.Element {
	const spec: DashboardtypesNumberPanelSpecDTO = panel.spec.plugin.spec;

	const builderQueries = getBuilderQueries(panel.spec.queries || []);

	const tables = prepareScalarTables({
		results: getScalarResults(data.response),
		legendMap: data.legendMap ?? {},
		requestPayload: data.requestPayload,
	});

	const value = prepareNumberData(tables);

	const thresholds = mapNumberThresholds(spec.thresholds);

	const decimalPrecision = resolveDecimalPrecision(
		spec.formatting?.decimalPrecision,
	);

	const unit = spec.formatting?.unit;

	// Precision is applied regardless of whether a unit is set (see
	// `formatPanelValue`), so decimal-precision changes always take effect.
	const formattedValue =
		value === null ? '' : formatPanelValue(value, unit, decimalPrecision);

	const openDrilldown = (coordinates: { x: number; y: number }): void => {
		if (!onClick) {
			return;
		}
		const payload = enrichNumberClick({
			tables,
			builderQueries,
			coordinates,
			timeRange: getPanelTimeRange(data.requestPayload),
		});
		if (payload) {
			onClick(payload);
		}
	};

	const handleClick = (event: ReactMouseEvent<HTMLDivElement>): void =>
		openDrilldown({ x: event.clientX, y: event.clientY });

	const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>): void => {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			const rect = event.currentTarget.getBoundingClientRect();
			openDrilldown({
				x: rect.left + rect.width / 2,
				y: rect.top + rect.height / 2,
			});
		}
	};

	// The whole panel is the value, so the container itself is the drill-down target.
	const isClickable = enableDrillDown && !!onClick && value !== null;

	return (
		<div
			data-testid="number-panel-renderer"
			className={PanelStyles.panelContainer}
			{...(isClickable
				? {
						role: 'button',
						tabIndex: 0,
						onClick: handleClick,
						onKeyDown: handleKeyDown,
						style: { cursor: 'pointer' },
					}
				: {})}
		>
			{value === null ? (
				<NoData
					data-testid="number-panel-no-data"
					isFetching={isFetching}
					onRetry={refetch}
					panel={panel}
				/>
			) : (
				<ValueDisplay
					value={formattedValue}
					rawValue={value}
					thresholds={thresholds}
					unit={unit}
				/>
			)}
		</div>
	);
}

export default NumberPanelRenderer;
