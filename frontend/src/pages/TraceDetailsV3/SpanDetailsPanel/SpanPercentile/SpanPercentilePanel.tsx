import { Checkbox, Input, Select, Skeleton } from 'antd';
import { Typography } from '@signozhq/ui/typography';
import { getYAxisFormattedValue } from 'components/Graph/yAxisConfig';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import dayjs from 'dayjs';
import { Check, ChevronDown, Loader, Plus } from '@signozhq/icons';
import { SpanV3 } from 'types/api/trace/getTraceV3';

import { UseSpanPercentileReturn } from './useSpanPercentile';

import './SpanPercentile.styles.scss';

const DEFAULT_RESOURCE_ATTRIBUTES = {
	serviceName: 'service.name',
	name: 'name',
};

const timerangeOptions = [1, 2, 4, 6, 12, 24].map((hours) => ({
	label: `${hours}h`,
	value: hours,
}));

interface SpanPercentilePanelProps {
	selectedSpan: SpanV3;
	percentile: UseSpanPercentileReturn;
}

function SpanPercentilePanel({
	selectedSpan,
	percentile,
}: SpanPercentilePanelProps): JSX.Element | null {
	const {
		isOpen,
		toggleOpen,
		isError,
		loading,
		spanPercentileData,
		selectedTimeRange,
		setSelectedTimeRange,
		showResourceAttributesSelector,
		setShowResourceAttributesSelector,
		resourceAttributesSearchQuery,
		setResourceAttributesSearchQuery,
		spanResourceAttributes,
		handleResourceAttributeChange,
		resourceAttributesSelectorRef,
		isLoadingData,
		isFetchingData,
	} = percentile;

	if (!isOpen || isError) {
		return null;
	}

	return (
		<div className="span-percentile-panel">
			<div className="span-percentile-panel__header">
				<Typography.Text
					className="span-percentile-panel__header-text"
					onClick={toggleOpen}
				>
					<ChevronDown size={16} /> Span Percentile
				</Typography.Text>

				{showResourceAttributesSelector ? (
					<Check
						size={16}
						className="cursor-pointer span-percentile-panel__header-icon"
						onClick={(): void => setShowResourceAttributesSelector(false)}
					/>
				) : (
					<Plus
						size={16}
						className="cursor-pointer span-percentile-panel__header-icon"
						onClick={(): void => setShowResourceAttributesSelector(true)}
					/>
				)}
			</div>

			{showResourceAttributesSelector && (
				<div
					className="span-percentile-panel__resource-selector"
					ref={resourceAttributesSelectorRef}
				>
					<div className="span-percentile-panel__resource-selector-header">
						<Input
							placeholder="Search resource attributes"
							className="span-percentile-panel__resource-selector-input"
							value={resourceAttributesSearchQuery}
							onChange={(e): void =>
								setResourceAttributesSearchQuery(e.target.value as string)
							}
						/>
					</div>
					<div className="span-percentile-panel__resource-selector-items">
						{spanResourceAttributes
							.filter((attr) =>
								attr.key
									.toLowerCase()
									.includes(resourceAttributesSearchQuery.toLowerCase()),
							)
							.map((attr) => (
								<div
									className="span-percentile-panel__resource-selector-item"
									key={attr.key}
								>
									<Checkbox
										checked={attr.isSelected}
										onChange={(e): void => {
											handleResourceAttributeChange(
												attr.key,
												attr.value,
												e.target.checked,
											);
										}}
										disabled={
											attr.key === DEFAULT_RESOURCE_ATTRIBUTES.serviceName ||
											attr.key === DEFAULT_RESOURCE_ATTRIBUTES.name
										}
									>
										<div className="span-percentile-panel__resource-selector-item-value">
											{attr.key}
										</div>
									</Checkbox>
								</div>
							))}
					</div>
				</div>
			)}

			<div className="span-percentile-panel__content">
				<Typography.Text className="span-percentile-panel__content-title">
					This span duration is{' '}
					{!loading && spanPercentileData ? (
						<span className="span-percentile-panel__content-highlight">
							p{Math.floor(spanPercentileData.percentile || 0)}
						</span>
					) : (
						<span className="span-percentile-panel__content-loader">
							<Loader size={12} className="animate-spin" />
						</span>
					)}{' '}
					out of the distribution for this resource evaluated for {selectedTimeRange}{' '}
					hour(s) since the span start time.
				</Typography.Text>

				<div className="span-percentile-panel__timerange">
					<Select
						labelInValue
						placeholder="Select timerange"
						className="span-percentile-panel__timerange-select"
						getPopupContainer={(trigger): HTMLElement =>
							trigger.parentElement || document.body
						}
						value={{
							label: `${selectedTimeRange}h : ${dayjs(selectedSpan.timestamp)
								.subtract(selectedTimeRange, 'hour')
								.format(DATE_TIME_FORMATS.TIME_SPAN_PERCENTILE)} - ${dayjs(
								selectedSpan.timestamp,
							).format(DATE_TIME_FORMATS.TIME_SPAN_PERCENTILE)}`,
							value: selectedTimeRange,
						}}
						onChange={(value): void => {
							setSelectedTimeRange(Number(value.value));
						}}
						options={timerangeOptions}
					/>
				</div>

				<div className="span-percentile-panel__table">
					<div className="span-percentile-panel__table-header">
						<Typography.Text className="span-percentile-panel__table-header-text">
							Percentile
						</Typography.Text>
						<Typography.Text className="span-percentile-panel__table-header-text">
							Duration
						</Typography.Text>
					</div>

					<div className="span-percentile-panel__table-rows">
						{isLoadingData || isFetchingData ? (
							<Skeleton
								active
								paragraph={{ rows: 3 }}
								className="span-percentile-panel__table-skeleton"
							/>
						) : (
							<>
								{Object.entries(spanPercentileData?.percentiles || {}).map(
									([pKey, pDuration]) => (
										<div className="span-percentile-panel__table-row" key={pKey}>
											<Typography.Text className="span-percentile-panel__table-row-key">
												{pKey}
											</Typography.Text>
											<div className="span-percentile-panel__table-row-dash" />
											<Typography.Text className="span-percentile-panel__table-row-value">
												{getYAxisFormattedValue(`${pDuration / 1000000}`, 'ms')}
											</Typography.Text>
										</div>
									),
								)}

								<div className="span-percentile-panel__table-row span-percentile-panel__table-row--current">
									<Typography.Text className="span-percentile-panel__table-row-key">
										p{Math.floor(spanPercentileData?.percentile || 0)}
									</Typography.Text>
									<div className="span-percentile-panel__table-row-dash" />
									<Typography.Text className="span-percentile-panel__table-row-value">
										(this span){' '}
										{getYAxisFormattedValue(
											`${selectedSpan.duration_nano / 1000000}`,
											'ms',
										)}
									</Typography.Text>
								</div>
							</>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}

export default SpanPercentilePanel;
