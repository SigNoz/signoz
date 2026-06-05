import { useMemo } from 'react';
import cx from 'classnames';
import TooltipHeader from 'lib/uPlotV2/components/Tooltip/components/TooltipHeader/TooltipHeader';
import TooltipItem from 'lib/uPlotV2/components/Tooltip/components/TooltipItem/TooltipItem';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import { getToolTipValue } from 'components/Graph/yAxisConfig';
import { buildTooltipContent } from 'lib/uPlotV2/components/Tooltip/utils';
import {
	TooltipContentItem,
	TooltipRenderArgs,
} from 'lib/uPlotV2/components/types';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';

import TooltipStyles from 'lib/uPlotV2/components/Tooltip/Tooltip.module.scss';
import Styles from './BillingBarChartTooltip.module.scss';

interface BillingBarChartTooltipProps extends TooltipRenderArgs {
	billingApiResponse: MetricRangePayloadProps;
}

const CURRENCY_SYMBOL = '$';

export function BillingBarChartTooltip({
	billingApiResponse,
	uPlotInstance,
	dataIndexes,
	seriesIndex,
	isPinned,
}: BillingBarChartTooltipProps): JSX.Element {
	const content = useMemo((): TooltipContentItem[] => {
		const baseItems = buildTooltipContent({
			data: uPlotInstance.data,
			series: uPlotInstance.series,
			dataIndexes,
			activeSeriesIndex: seriesIndex,
			uPlotInstance,
			yAxisUnit: '',
			isStackedBarChart: true,
		});

		return baseItems.map((item) => {
			const match = billingApiResponse.data.result.find(
				(r) => (r.legend || r.queryName) === item.label,
			);

			if (!match) {
				return item;
			}

			const seriesIdx = uPlotInstance.series.findIndex(
				(s) => s.label === item.label,
			);
			if (seriesIdx === -1) {
				return item;
			}

			const dataIndex = dataIndexes[seriesIdx];
			const quantity = dataIndex != null ? match.quantity?.[dataIndex] : null;
			const unit = match.unit ?? '';
			const quantityStr =
				quantity != null ? ` - ${getToolTipValue(quantity)} ${unit}` : '';

			return {
				...item,
				tooltipValue: `${CURRENCY_SYMBOL}${getToolTipValue(item.value, '')}${quantityStr}`,
			};
		});
	}, [uPlotInstance, seriesIndex, dataIndexes, billingApiResponse]);

	const activeItem = content.find((item) => item.isActive) ?? null;

	return (
		<div
			className={cx(TooltipStyles.container, {
				[TooltipStyles.pinned]: isPinned,
			})}
			data-testid="uplot-tooltip-container"
		>
			<TooltipHeader
				uPlotInstance={uPlotInstance}
				showTooltipHeader
				isPinned={isPinned}
				activeItem={null}
				headerRowClassName={Styles.headerRow}
				dateFormat={DATE_TIME_FORMATS.MONTH_DATE}
			/>
			{activeItem != null && <span className={TooltipStyles.divider} />}
			<div className={Styles.itemList} data-testid="uplot-tooltip-list">
				{content.map((item) => (
					<TooltipItem key={item.label} item={item} isItemActive={item.isActive} />
				))}
			</div>
		</div>
	);
}
