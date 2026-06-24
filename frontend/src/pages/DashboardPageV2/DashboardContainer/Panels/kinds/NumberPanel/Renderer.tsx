import { useMemo } from 'react';
import type { DashboardtypesNumberPanelSpecDTO } from 'api/generated/services/sigNoz.schemas';
import { prepareScalarTables } from 'pages/DashboardPageV2/DashboardContainer/queryV5/prepareScalarTables';
import { getScalarResults } from 'pages/DashboardPageV2/DashboardContainer/queryV5/v5ResponseData';

import NoData from '../../components/NoData/NoData';
import PanelStyles from '../../panel.module.scss';
import { PanelRendererProps } from '../../types/rendererProps';
import { formatPanelValue } from '../../utils/formatPanelValue';
import { resolveDecimalPrecision } from '../../utils/chartAppearance/resolvers';

import { prepareNumberData } from './prepareData';
import { mapNumberThresholds } from './utils';
import ValueDisplay from './components/ValueDisplay/ValueDisplay';

function NumberPanelRenderer({
	panel,
	data,
}: PanelRendererProps<'signoz/NumberPanel'>): JSX.Element {
	// The registry guarantees the kind, so the cast is a boundary narrowing.
	const spec = useMemo<DashboardtypesNumberPanelSpecDTO>(
		() => panel.spec.plugin.spec as DashboardtypesNumberPanelSpecDTO,
		[panel.spec.plugin.spec],
	);

	const value = useMemo(
		() =>
			prepareNumberData(
				prepareScalarTables({
					results: getScalarResults(data.response),
					legendMap: data.legendMap ?? {},
					requestPayload: data.requestPayload,
				}),
			),
		[data.response, data.legendMap, data.requestPayload],
	);

	const thresholds = useMemo(
		() => mapNumberThresholds(spec.thresholds),
		[spec.thresholds],
	);

	const decimalPrecision = useMemo(
		() => resolveDecimalPrecision(spec.formatting?.decimalPrecision),
		[spec.formatting?.decimalPrecision],
	);

	const unit = spec.formatting?.unit;

	// Precision is applied regardless of whether a unit is set (see
	// `formatPanelValue`), so decimal-precision changes always take effect.
	const formattedValue = useMemo(
		() => (value === null ? '' : formatPanelValue(value, unit, decimalPrecision)),
		[value, unit, decimalPrecision],
	);

	return (
		<div
			data-testid="number-panel-renderer"
			className={PanelStyles.panelContainer}
		>
			{value === null ? (
				<NoData data-testid="number-panel-no-data" />
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
