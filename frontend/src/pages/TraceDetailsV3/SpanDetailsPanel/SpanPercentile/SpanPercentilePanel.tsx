import { Checkbox, Input, Select, Skeleton } from 'antd';
import { Button } from '@signozhq/ui/button';
import { Typography } from '@signozhq/ui/typography';
import cx from 'classnames';
import { getYAxisFormattedValue } from 'components/Graph/yAxisConfig';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import dayjs from 'dayjs';
import { Check, ChevronDown, Loader, Plus } from '@signozhq/icons';
import { SpanV3 } from 'types/api/trace/getTraceV3';

import { UseSpanPercentileReturn } from './useSpanPercentile';

import styles from './SpanPercentilePanel.module.scss';

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
		<div className={styles.root}>
			<div className={styles.header}>
				<Button
					variant="link"
					color="secondary"
					onClick={toggleOpen}
					prefix={<ChevronDown size={16} />}
				>
					Span Percentile
				</Button>

				<Button
					variant="link"
					color="secondary"
					size="icon"
					onClick={(): void =>
						setShowResourceAttributesSelector(!showResourceAttributesSelector)
					}
					prefix={
						showResourceAttributesSelector ? <Check size={16} /> : <Plus size={16} />
					}
				/>
			</div>

			{showResourceAttributesSelector && (
				<div
					className={styles.resourceSelector}
					ref={resourceAttributesSelectorRef}
				>
					<div className={styles.resourceSelectorHeader}>
						<Input
							placeholder="Search resource attributes"
							className={styles.resourceSelectorInput}
							value={resourceAttributesSearchQuery}
							onChange={(e): void =>
								setResourceAttributesSearchQuery(e.target.value as string)
							}
						/>
					</div>
					<div className={styles.resourceSelectorItems}>
						{spanResourceAttributes
							.filter((attr) =>
								attr.key
									.toLowerCase()
									.includes(resourceAttributesSearchQuery.toLowerCase()),
							)
							.map((attr) => (
								<div className={styles.resourceSelectorItem} key={attr.key}>
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
										<div className={styles.resourceSelectorItemValue}>{attr.key}</div>
									</Checkbox>
								</div>
							))}
					</div>
				</div>
			)}

			<div className={styles.content}>
				<Typography.Text className={styles.contentTitle}>
					This span duration is{' '}
					{!loading && spanPercentileData ? (
						<span className={styles.contentHighlight}>
							p{Math.floor(spanPercentileData.percentile || 0)}
						</span>
					) : (
						<span className={styles.contentLoader}>
							<Loader size={12} className="animate-spin" />
						</span>
					)}{' '}
					out of the distribution for this resource evaluated for {selectedTimeRange}{' '}
					hour(s) since the span start time.
				</Typography.Text>

				<div className={styles.timerange}>
					<Select
						labelInValue
						placeholder="Select timerange"
						className={styles.timerangeSelect}
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

				<div>
					<div className={styles.tableHeader}>
						<Typography.Text className={styles.tableHeaderText}>
							Percentile
						</Typography.Text>
						<Typography.Text className={styles.tableHeaderText}>
							Duration
						</Typography.Text>
					</div>

					<div className={styles.tableRows}>
						{isLoadingData || isFetchingData ? (
							<Skeleton
								active
								paragraph={{ rows: 3 }}
								className={styles.tableSkeleton}
							/>
						) : (
							<>
								{Object.entries(spanPercentileData?.percentiles || {}).map(
									([pKey, pDuration]) => (
										<div className={styles.tableRow} key={pKey}>
											<Typography.Text className={styles.tableRowKey}>
												{pKey}
											</Typography.Text>
											<div className={styles.tableRowDash} />
											<Typography.Text className={styles.tableRowValue}>
												{getYAxisFormattedValue(`${pDuration / 1000000}`, 'ms')}
											</Typography.Text>
										</div>
									),
								)}

								<div className={cx(styles.tableRow, styles.isCurrent)}>
									<Typography.Text className={styles.tableRowKey}>
										p{Math.floor(spanPercentileData?.percentile || 0)}
									</Typography.Text>
									<div className={styles.tableRowDash} />
									<Typography.Text className={styles.tableRowValue}>
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
