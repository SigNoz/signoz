import './SpanDetailsDrawer.styles.scss';

import { Button, Select, Tabs, TabsProps, Tooltip, Typography } from 'antd';
import { RadioChangeEvent } from 'antd/lib';
import LogsIcon from 'assets/AlertHistory/LogsIcon';
import { getYAxisFormattedValue } from 'components/Graph/yAxisConfig';
import SignozRadioGroup from 'components/SignozRadioGroup/SignozRadioGroup';
import { themeColors } from 'constants/theme';
import { generateColor } from 'lib/uPlotLib/utils/generateColor';
import {
	Anvil,
	Bookmark,
	ChevronDown,
	Link2,
	PanelRight,
	PlusIcon,
	Search,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import {
	Dispatch,
	SetStateAction,
	useCallback,
	useMemo,
	useState,
} from 'react';
import { Span } from 'types/api/trace/getTraceV2';
import { formatEpochTimestamp } from 'utils/timeUtils';

import Attributes from './Attributes/Attributes';
import { RelatedSignalsViews } from './constants';
import Events from './Events/Events';
import LinkedSpans from './LinkedSpans/LinkedSpans';
import SpanRelatedSignals from './SpanRelatedSignals/SpanRelatedSignals';

interface ISpanDetailsDrawerProps {
	isSpanDetailsDocked: boolean;
	setIsSpanDetailsDocked: Dispatch<SetStateAction<boolean>>;
	selectedSpan: Span | undefined;
	traceStartTime: number;
	traceEndTime: number;
}

const timerangeOptions = [
	{
		label: 'Last 1 hour',
		value: '1h',
	},
	{
		label: 'Last 3 hours',
		value: '3h',
	},
	{
		label: 'Last 6 hours',
		value: '6h',
	},
	{
		label: 'Last 9 hours',
		value: '9h',
	},
	{
		label: 'Last 12 hours',
		value: '12h',
	},
	{
		label: 'Last 15 hours',
		value: '15h',
	},
	{
		label: 'Last 18 hours',
		value: '18h',
	},
	{
		label: 'Last 21 hours',
		value: '21h',
	},
	{
		label: 'Last 24 hours',
		value: '24h',
	},
];

function SpanDetailsDrawer(props: ISpanDetailsDrawerProps): JSX.Element {
	const {
		isSpanDetailsDocked,
		setIsSpanDetailsDocked,
		selectedSpan,
		traceStartTime,
		traceEndTime,
	} = props;

	const [isSearchVisible, setIsSearchVisible] = useState<boolean>(true);
	const [shouldAutoFocusSearch, setShouldAutoFocusSearch] = useState<boolean>(
		false,
	);
	const [isSpanPercentilesOpen, setIsSpanPercentilesOpen] = useState<boolean>(
		false,
	);
	const [isRelatedSignalsOpen, setIsRelatedSignalsOpen] = useState<boolean>(
		false,
	);
	const [activeDrawerView, setActiveDrawerView] = useState<RelatedSignalsViews>(
		RelatedSignalsViews.LOGS,
	);
	const color = generateColor(
		selectedSpan?.serviceName || '',
		themeColors.traceDetailColors,
	);

	const handleRelatedSignalsChange = useCallback((e: RadioChangeEvent): void => {
		const selectedView = e.target.value as RelatedSignalsViews;
		setActiveDrawerView(selectedView);
		setIsRelatedSignalsOpen(true);
	}, []);

	const handleRelatedSignalsClose = useCallback((): void => {
		setIsRelatedSignalsOpen(false);
	}, []);

	function getItems(span: Span, startTime: number): TabsProps['items'] {
		return [
			{
				label: (
					<Button
						type="text"
						icon={<Bookmark size="14" />}
						className="attributes-tab-btn"
					>
						<span className="tab-label">Attributes</span>
						<span className="count-badge">
							{Object.keys(span.tagMap || {}).length}
						</span>
					</Button>
				),
				key: 'attributes',
				children: (
					<Attributes
						span={span}
						isSearchVisible={isSearchVisible}
						shouldFocusOnToggle={shouldAutoFocusSearch}
					/>
				),
			},
			{
				label: (
					<Button type="text" icon={<Anvil size="14" />} className="events-tab-btn">
						<span className="tab-label">Events</span>
						<span className="count-badge">{span.event?.length || 0}</span>
					</Button>
				),
				key: 'events',
				children: (
					<Events
						span={span}
						startTime={startTime}
						isSearchVisible={isSearchVisible}
					/>
				),
			},
			{
				label: (
					<Button
						type="text"
						icon={<Link2 size="14" />}
						className="linked-spans-tab-btn"
					>
						<span className="tab-label">Links</span>
						<span className="count-badge">
							{
								(
									span.references?.filter((ref: any) => ref.refType !== 'CHILD_OF') || []
								).length
							}
						</span>
					</Button>
				),
				key: 'linked-spans',
				children: <LinkedSpans span={span} />,
			},
		];
	}

	const spanPercentileTooltipText = useMemo(
		() => (
			<div className="span-percentile-tooltip-text">
				<Typography.Text>
					This span duration is p39 out of the distribution for this resource
					evaluated for the past 1 hour.
				</Typography.Text>
				<br />
				<Typography.Text className="span-percentile-tooltip-text-link">
					Click to learn more
				</Typography.Text>
			</div>
		),
		[],
	);

	return (
		<>
			<section className="header">
				{!isSpanDetailsDocked && (
					<div className="heading">
						<div className="dot" style={{ background: color }} />
						<Typography.Text className="text">Span Details</Typography.Text>
					</div>
				)}
				<PanelRight
					size={14}
					cursor="pointer"
					onClick={(): void => setIsSpanDetailsDocked((prev) => !prev)}
				/>
			</section>
			{selectedSpan && !isSpanDetailsDocked && (
				<>
					<section className="description">
						<div className="item">
							<Typography.Text className="attribute-key">span name</Typography.Text>

							<div className="value-wrapper span-name-wrapper">
								<Tooltip title={selectedSpan.name}>
									<Typography.Text className="attribute-value" ellipsis>
										{selectedSpan.name}
									</Typography.Text>
								</Tooltip>

								<Tooltip
									title={isSpanPercentilesOpen ? '' : spanPercentileTooltipText}
									placement="bottomRight"
								>
									<Typography.Text
										className="span-percentile-value"
										onClick={(): void => setIsSpanPercentilesOpen((prev) => !prev)}
									>
										p39
									</Typography.Text>
								</Tooltip>
							</div>

							<AnimatePresence initial={false}>
								{isSpanPercentilesOpen && (
									<motion.div
										initial={{ height: 0, opacity: 0 }}
										animate={{ height: 'auto', opacity: 1 }}
										exit={{ height: 0, opacity: 0 }}
										key="box"
									>
										<div className="span-percentiles-container">
											<div className="span-percentiles-header">
												<Typography.Text
													className="span-percentiles-header-text"
													onClick={(): void => setIsSpanPercentilesOpen((prev) => !prev)}
												>
													<ChevronDown size={16} /> Span Percentile
												</Typography.Text>

												<PlusIcon
													size={16}
													className="cursor-pointer span-percentiles-header-icon"
												/>
											</div>

											<div className="span-percentile-content">
												<Typography.Text className="span-percentile-content-title">
													This span duration is p39 out of the distribution for this resource
													evaluated for the past 1 hour.
												</Typography.Text>

												<div className="span-percentile-timerange">
													<Select
														placeholder="Select timerange"
														className="span-percentile-timerange-select"
														options={timerangeOptions}
														filterOption={(input, option): boolean =>
															(option?.value ?? '')
																.toLowerCase()
																.includes(input.trim().toLowerCase())
														}
													/>
												</div>

												<div className="span-percentile-values-table">
													<div className="span-percentile-values-table-header-row">
														<Typography.Text className="span-percentile-values-table-header">
															Percentile
														</Typography.Text>

														<Typography.Text className="span-percentile-values-table-header">
															Duration
														</Typography.Text>
													</div>

													<div className="span-percentile-values-table-data-rows">
														<div className="span-percentile-values-table-data-row">
															<Typography.Text className="span-percentile-values-table-data-row-item">
																p39
															</Typography.Text>

															<div className="dashed-line" />

															<Typography.Text className="span-percentile-values-table-data-row-item">
																{getYAxisFormattedValue(`${selectedSpan.durationNano}`, 'ns')}
															</Typography.Text>
														</div>

														<div className="span-percentile-values-table-data-row">
															<Typography.Text className="span-percentile-values-table-data-row-item">
																p39
															</Typography.Text>

															<div className="dashed-line" />

															<Typography.Text className="span-percentile-values-table-data-row-item">
																{getYAxisFormattedValue(`${selectedSpan.durationNano}`, 'ns')}
															</Typography.Text>
														</div>

														<div className="span-percentile-values-table-data-row">
															<Typography.Text className="span-percentile-values-table-data-row-item">
																p39
															</Typography.Text>

															<div className="dashed-line" />

															<Typography.Text className="span-percentile-values-table-data-row-item">
																{getYAxisFormattedValue(`${selectedSpan.durationNano}`, 'ns')}
															</Typography.Text>
														</div>
													</div>
												</div>
											</div>
										</div>
									</motion.div>
								)}
							</AnimatePresence>
						</div>
						<div className="item">
							<Typography.Text className="attribute-key">span id</Typography.Text>
							<div className="value-wrapper">
								<Typography.Text className="attribute-value">
									{selectedSpan.spanId}
								</Typography.Text>
							</div>
						</div>
						<div className="item">
							<Typography.Text className="attribute-key">start time</Typography.Text>
							<div className="value-wrapper">
								<Typography.Text className="attribute-value">
									{formatEpochTimestamp(selectedSpan.timestamp)}
								</Typography.Text>
							</div>
						</div>
						<div className="item">
							<Typography.Text className="attribute-key">duration</Typography.Text>
							<div className="value-wrapper">
								<Typography.Text className="attribute-value">
									{getYAxisFormattedValue(`${selectedSpan.durationNano}`, 'ns')}
								</Typography.Text>
							</div>
						</div>
						<div className="item">
							<Typography.Text className="attribute-key">service</Typography.Text>
							<div className="service">
								<div className="dot" style={{ backgroundColor: color }} />
								<div className="value-wrapper">
									<Tooltip title={selectedSpan.serviceName}>
										<Typography.Text className="service-value" ellipsis>
											{selectedSpan.serviceName}
										</Typography.Text>
									</Tooltip>
								</div>
							</div>
						</div>
						<div className="item">
							<Typography.Text className="attribute-key">span kind</Typography.Text>
							<div className="value-wrapper">
								<Typography.Text className="attribute-value">
									{selectedSpan.spanKind}
								</Typography.Text>
							</div>
						</div>
						<div className="item">
							<Typography.Text className="attribute-key">
								status code string
							</Typography.Text>
							<div className="value-wrapper">
								<Typography.Text className="attribute-value">
									{selectedSpan.statusCodeString}
								</Typography.Text>
							</div>
						</div>

						{selectedSpan.statusMessage && (
							<div className="item">
								<Typography.Text className="attribute-key">
									status message
								</Typography.Text>
								<div className="value-wrapper">
									<Typography.Text className="attribute-value">
										{selectedSpan.statusMessage}
									</Typography.Text>
								</div>
							</div>
						)}
						<div className="item">
							<Typography.Text className="attribute-key">
								related signals
							</Typography.Text>
							<div className="related-signals-section">
								<SignozRadioGroup
									value=""
									options={[
										{
											label: (
												<div className="view-title">
													<LogsIcon width={14} height={14} />
													Logs
												</div>
											),
											value: RelatedSignalsViews.LOGS,
										},
									]}
									onChange={handleRelatedSignalsChange}
									className="related-signals-radio"
								/>
							</div>
						</div>
					</section>

					<section className="attributes-events">
						<Tabs
							items={getItems(selectedSpan, traceStartTime)}
							addIcon
							defaultActiveKey="attributes"
							className="details-drawer-tabs"
							tabBarExtraContent={
								<Search
									size={14}
									className="search-icon"
									cursor="pointer"
									onClick={(): void => {
										setIsSearchVisible((prev) => {
											const newValue = !prev;
											// Only set toggle flag when search becomes visible
											if (newValue) {
												setShouldAutoFocusSearch(true);
											}
											return newValue;
										});
									}}
								/>
							}
						/>
					</section>
				</>
			)}

			{selectedSpan && (
				<SpanRelatedSignals
					selectedSpan={selectedSpan}
					traceStartTime={traceStartTime}
					traceEndTime={traceEndTime}
					isOpen={isRelatedSignalsOpen}
					onClose={handleRelatedSignalsClose}
					initialView={activeDrawerView}
					key={activeDrawerView}
				/>
			)}
		</>
	);
}

export default SpanDetailsDrawer;
