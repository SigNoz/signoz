import './SpanDetailsDrawer.styles.scss';

import {
	Button,
	Checkbox,
	Input,
	Select,
	Tabs,
	TabsProps,
	Tooltip,
	Typography,
} from 'antd';
import { RadioChangeEvent } from 'antd/lib';
import getSpanPercentiles from 'api/trace/getSpanPercentiles';
import getUserPreference from 'api/v1/user/preferences/name/get';
import LogsIcon from 'assets/AlertHistory/LogsIcon';
import { getYAxisFormattedValue } from 'components/Graph/yAxisConfig';
import SignozRadioGroup from 'components/SignozRadioGroup/SignozRadioGroup';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { themeColors } from 'constants/theme';
import { USER_PREFERENCES } from 'constants/userPreferences';
import dayjs from 'dayjs';
import useClickOutside from 'hooks/useClickOutside';
import { generateColor } from 'lib/uPlotLib/utils/generateColor';
import {
	Anvil,
	Bookmark,
	Check,
	ChevronDown,
	Link2,
	Loader2,
	PanelRight,
	PlusIcon,
	Search,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import {
	Dispatch,
	SetStateAction,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import { useQuery } from 'react-query';
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
		label: '1 hour',
		value: 1,
	},
	{
		label: '2 hours',
		value: 2,
	},
	{
		label: '3 hours',
		value: 3,
	},
	{
		label: '6 hours',
		value: 6,
	},
	{
		label: '12 hours',
		value: 12,
	},
	{
		label: '24 hours',
		value: 24,
	},
];

interface IResourceAttribute {
	key: string;
	value: string;
	isSelected: boolean;
}

// eslint-disable-next-line sonarjs/cognitive-complexity
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

	const [selectedTimeRange, setSelectedTimeRange] = useState<number>(1);
	const [
		resourceAttributesSearchQuery,
		setResourceAttributesSearchQuery,
	] = useState<string>('');

	const [spanPercentileData, setSpanPercentileData] = useState<{
		percentile: number;
		description: string;
		percentiles: Record<string, number>;
	} | null>(null);

	const [
		showResourceAttributesSelector,
		setShowResourceAttributesSelector,
	] = useState<boolean>(false);

	const [selectedResourceAttributes, setSelectedResourceAttributes] = useState<
		Record<string, string>
	>({});

	const [spanResourceAttributes, updateSpanResourceAttributes] = useState<
		IResourceAttribute[]
	>([] as IResourceAttribute[]);

	const [initialWaitCompleted, setInitialWaitCompleted] = useState<boolean>(
		false,
	);

	const [
		shouldFetchSpanPercentilesData,
		setShouldFetchSpanPercentilesData,
	] = useState<boolean>(false);

	const handleTimeRangeChange = useCallback((value: number): void => {
		setShouldFetchSpanPercentilesData(true);
		setSelectedTimeRange(value);
	}, []);

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

	const resourceAttributesSelectorRef = useRef<HTMLDivElement | null>(null);

	useClickOutside({
		ref: resourceAttributesSelectorRef,
		onClickOutside: () => {
			if (resourceAttributesSelectorRef.current) {
				setShowResourceAttributesSelector(false);
			}
		},
		eventType: 'mousedown',
	});

	const spanPercentileTooltipText = useMemo(
		() => (
			<div className="span-percentile-tooltip-text">
				<Typography.Text>
					This span duration is{' '}
					<span className="span-percentile-tooltip-text-percentile">
						p{Math.floor(spanPercentileData?.percentile || 0)}
					</span>{' '}
					out of the distribution for this resource evaluated for {selectedTimeRange}{' '}
					hour(s) since the span start time.
				</Typography.Text>
				<br />
				<br />
				<Typography.Text className="span-percentile-tooltip-text-link">
					Click to learn more
				</Typography.Text>
			</div>
		),
		[spanPercentileData?.percentile, selectedTimeRange],
	);

	const endTime = useMemo(
		() => Math.floor(Number(selectedSpan?.timestamp) / 1000) * 1000,
		[selectedSpan?.timestamp],
	);

	const startTime = useMemo(
		() =>
			dayjs(selectedSpan?.timestamp)
				.subtract(Number(selectedTimeRange), 'hour')
				.unix() * 1000,
		[selectedSpan?.timestamp, selectedTimeRange],
	);

	const { data: userSelectedResourceAttributes } = useQuery({
		queryFn: () =>
			getUserPreference({
				name: USER_PREFERENCES.SPAN_PERCENTILE_RESOURCE_ATTRIBUTES,
			}),
		queryKey: [
			'getUserPreferenceByPreferenceName',
			USER_PREFERENCES.SPAN_PERCENTILE_RESOURCE_ATTRIBUTES,
			selectedSpan?.spanId,
		],
		enabled: selectedSpan !== null && selectedSpan?.tagMap !== undefined,
	});

	const {
		isLoading: isLoadingSpanPercentilesData,
		data,
		refetch: refetchSpanPercentilesData,
	} = useQuery({
		queryFn: () =>
			getSpanPercentiles({
				start: startTime || 0,
				end: endTime || 0,
				span_duration: selectedSpan?.durationNano || 0,
				service_name: selectedSpan?.serviceName || '',
				name: selectedSpan?.name || '',
				resource_attributes: selectedResourceAttributes,
			}),
		queryKey: [
			REACT_QUERY_KEY.GET_SPAN_PERCENTILES,
			selectedSpan?.spanId,
			startTime,
			endTime,
		],
		enabled:
			selectedSpan !== null &&
			shouldFetchSpanPercentilesData &&
			!showResourceAttributesSelector &&
			initialWaitCompleted,
	});

	// Prod Req - Wait for 2 seconds before fetching span percentile data on initial load
	useEffect(() => {
		const timer = setTimeout(() => {
			setInitialWaitCompleted(true);
		}, 2000); // 2-second delay

		return (): void => clearTimeout(timer); // Cleanup on unmount
	}, [selectedSpan?.spanId]);

	useEffect(() => {
		if (data?.statusCode !== 200) {
			setSpanPercentileData(null);

			return;
		}

		if (data) {
			const percentileData = {
				percentile: data.payload?.data?.position?.percentile || 0,
				description: data.payload?.data?.position?.description || '',
				percentiles: data.payload?.data?.percentiles || {},
			};

			setSpanPercentileData(percentileData);
		}
	}, [data]);

	useEffect(() => {
		if (userSelectedResourceAttributes) {
			const userSelectedResourceAttributesList = (userSelectedResourceAttributes
				?.data?.value as string[]).map((attribute: string) => attribute);

			let selectedResourceAttributesMap: Record<string, string> = {};

			userSelectedResourceAttributesList.forEach((attribute: string) => {
				selectedResourceAttributesMap[attribute] =
					selectedSpan?.tagMap?.[attribute] || '';
			});

			// filter out the attributes that are not in the selectedSpan?.tagMap
			selectedResourceAttributesMap = Object.fromEntries(
				Object.entries(selectedResourceAttributesMap).filter(
					([key]) => selectedSpan?.tagMap?.[key] !== undefined,
				),
			);

			const resourceAttributes = Object.entries(selectedSpan?.tagMap || {}).map(
				([key, value]) => ({
					key,
					value,
					isSelected:
						key === 'service.name' ||
						key === 'name' ||
						(key in selectedResourceAttributesMap &&
							selectedResourceAttributesMap[key] !== '' &&
							selectedResourceAttributesMap[key] !== undefined),
				}),
			);

			// selected resources should be at the top of the list
			const selectedResourceAttributes = resourceAttributes.filter(
				(resourceAttribute) => resourceAttribute.isSelected,
			);

			const unselectedResourceAttributes = resourceAttributes.filter(
				(resourceAttribute) => !resourceAttribute.isSelected,
			);

			const sortedResourceAttributes = [
				...selectedResourceAttributes,
				...unselectedResourceAttributes,
			];

			updateSpanResourceAttributes(sortedResourceAttributes);

			setSelectedResourceAttributes(
				selectedResourceAttributesMap as Record<string, string>,
			);

			setShouldFetchSpanPercentilesData(true);
		}
	}, [userSelectedResourceAttributes, selectedSpan?.tagMap]);

	const handleResourceAttributeChange = useCallback(
		(key: string, value: string, isSelected: boolean): void => {
			updateSpanResourceAttributes((prev) =>
				prev.map((resourceAttribute) =>
					resourceAttribute.key === key
						? { ...resourceAttribute, isSelected }
						: resourceAttribute,
				),
			);

			const newSelectedResourceAttributes = { ...selectedResourceAttributes };

			if (isSelected) {
				newSelectedResourceAttributes[key] = value;
			} else {
				delete newSelectedResourceAttributes[key];
			}

			setSelectedResourceAttributes(newSelectedResourceAttributes);

			setShouldFetchSpanPercentilesData(true);
		},
		[selectedResourceAttributes],
	);

	useEffect(() => {
		if (
			shouldFetchSpanPercentilesData &&
			!showResourceAttributesSelector &&
			initialWaitCompleted
		) {
			refetchSpanPercentilesData();
			setShouldFetchSpanPercentilesData(false);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [shouldFetchSpanPercentilesData, showResourceAttributesSelector]);

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

								{isLoadingSpanPercentilesData && (
									<div className="loading-spinner-container">
										<Loader2 size={16} className="animate-spin" />
									</div>
								)}

								{!isLoadingSpanPercentilesData && spanPercentileData && (
									<Tooltip
										title={isSpanPercentilesOpen ? '' : spanPercentileTooltipText}
										placement="bottomRight"
										overlayClassName="span-percentile-tooltip"
										arrow={false}
									>
										<Typography.Text
											className="span-percentile-value"
											onClick={(): void => setIsSpanPercentilesOpen((prev) => !prev)}
										>
											p{Math.floor(spanPercentileData?.percentile || 0)}
										</Typography.Text>
									</Tooltip>
								)}
							</div>

							<AnimatePresence initial={false}>
								{isSpanPercentilesOpen && spanPercentileData && (
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

												{showResourceAttributesSelector ? (
													<Check
														size={16}
														className="cursor-pointer span-percentiles-header-icon"
														onClick={(): void => setShowResourceAttributesSelector(false)}
													/>
												) : (
													<PlusIcon
														size={16}
														className="cursor-pointer span-percentiles-header-icon"
														onClick={(): void => setShowResourceAttributesSelector(true)}
													/>
												)}
											</div>

											{showResourceAttributesSelector && (
												<div
													className="resource-attributes-select-container"
													ref={resourceAttributesSelectorRef}
												>
													<div className="resource-attributes-select-container-header">
														<Input
															placeholder="Search resource attributes"
															className="resource-attributes-select-container-input"
															value={resourceAttributesSearchQuery}
															onChange={(e): void =>
																setResourceAttributesSearchQuery(e.target.value as string)
															}
														/>
													</div>

													<div className="resource-attributes-items">
														{spanResourceAttributes
															.filter((resourceAttribute) =>
																resourceAttribute.key
																	.toLowerCase()
																	.includes(resourceAttributesSearchQuery.toLowerCase()),
															)
															.map((resourceAttribute) => (
																<div
																	className="resource-attributes-select-item"
																	key={resourceAttribute.key}
																>
																	<div className="resource-attributes-select-item-checkbox">
																		<Checkbox
																			checked={resourceAttribute.isSelected}
																			onChange={(e): void => {
																				handleResourceAttributeChange(
																					resourceAttribute.key,
																					resourceAttribute.value,
																					e.target.checked,
																				);
																			}}
																			disabled={
																				resourceAttribute.key === 'service.name' ||
																				resourceAttribute.key === 'name'
																			}
																		>
																			<div className="resource-attributes-select-item-value">
																				{resourceAttribute.key}
																			</div>
																		</Checkbox>
																	</div>
																</div>
															))}
													</div>
												</div>
											)}

											<div className="span-percentile-content">
												<Typography.Text className="span-percentile-content-title">
													This span duration is{' '}
													<span className="span-percentile-value">
														p{Math.floor(spanPercentileData?.percentile || 0)}
													</span>{' '}
													out of the distribution for this resource evaluated for{' '}
													{selectedTimeRange} hour(s) since the span start time.{' '}
												</Typography.Text>

												<div className="span-percentile-timerange">
													<Select
														labelInValue
														placeholder="Select timerange"
														className="span-percentile-timerange-select"
														value={{
															label: `${selectedTimeRange}h : ${dayjs(selectedSpan?.timestamp)
																.subtract(selectedTimeRange, 'hour')
																.format(DATE_TIME_FORMATS.TIME_SPAN_PERCENTILE)} - ${dayjs(
																selectedSpan?.timestamp,
															).format(DATE_TIME_FORMATS.TIME_SPAN_PERCENTILE)}`,
															value: selectedTimeRange,
														}}
														onChange={(value): void => {
															handleTimeRangeChange(Number(value.value));
														}}
														options={timerangeOptions}
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
														{Object.entries(spanPercentileData?.percentiles || {}).map(
															([percentile, duration]) => (
																<div
																	className="span-percentile-values-table-data-row"
																	key={percentile}
																>
																	<Typography.Text className="span-percentile-values-table-data-row-key">
																		{percentile}
																	</Typography.Text>

																	<div className="dashed-line" />

																	<Typography.Text className="span-percentile-values-table-data-row-value">
																		{getYAxisFormattedValue(`${duration / 1000000}`, 'ms')}
																	</Typography.Text>
																</div>
															),
														)}

														<div className="span-percentile-values-table-data-row current-span-percentile-row">
															<Typography.Text className="span-percentile-values-table-data-row-key">
																p{Math.floor(spanPercentileData?.percentile || 0)}
															</Typography.Text>

															<div className="dashed-line" />

															<Typography.Text className="span-percentile-values-table-data-row-value">
																(this span){' '}
																{getYAxisFormattedValue(
																	`${selectedSpan.durationNano / 1000000}`,
																	'ms',
																)}
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
