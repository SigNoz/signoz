import './SpanDetailsDrawer.styles.scss';

import {
	Button,
	Checkbox,
	Input,
	Select,
	Skeleton,
	Tabs,
	TabsProps,
	Tooltip,
	Typography,
} from 'antd';
import getSpanPercentiles from 'api/trace/getSpanPercentiles';
import getUserPreference from 'api/v1/user/preferences/name/get';
import updateUserPreference from 'api/v1/user/preferences/name/update';
import LogsIcon from 'assets/AlertHistory/LogsIcon';
import { getYAxisFormattedValue } from 'components/Graph/yAxisConfig';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { themeColors } from 'constants/theme';
import { USER_PREFERENCES } from 'constants/userPreferences';
import dayjs from 'dayjs';
import useClickOutside from 'hooks/useClickOutside';
import { generateColor } from 'lib/uPlotLib/utils/generateColor';
import {
	Anvil,
	BarChart2,
	Bookmark,
	Check,
	ChevronDown,
	ChevronUp,
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
import { useMutation, useQuery } from 'react-query';
import { Span } from 'types/api/trace/getTraceV2';
import { formatEpochTimestamp } from 'utils/timeUtils';

import Attributes from './Attributes/Attributes';
import { RelatedSignalsViews } from './constants';
import Events from './Events/Events';
import LinkedSpans from './LinkedSpans/LinkedSpans';
import SpanRelatedSignals from './SpanRelatedSignals/SpanRelatedSignals';
import { hasInfraMetadata } from './utils';

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

const DEFAULT_RESOURCE_ATTRIBUTES = {
	serviceName: 'service.name',
	name: 'name',
};

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

	const [
		shouldUpdateUserPreference,
		setShouldUpdateUserPreference,
	] = useState<boolean>(false);

	const handleTimeRangeChange = useCallback((value: number): void => {
		setShouldFetchSpanPercentilesData(true);
		setSelectedTimeRange(value);
	}, []);

	const color = generateColor(
		selectedSpan?.serviceName || '',
		themeColors.traceDetailColors,
	);

	const handleRelatedSignalsClick = useCallback(
		(view: RelatedSignalsViews): void => {
			setActiveDrawerView(view);
			setIsRelatedSignalsOpen(true);
		},
		[],
	);

	const handleRelatedSignalsClose = useCallback((): void => {
		setIsRelatedSignalsOpen(false);
	}, []);

	const relatedSignalsOptions = useMemo(() => {
		const baseOptions = [
			{
				label: (
					<div className="view-title">
						<LogsIcon width={14} height={14} />
						Logs
					</div>
				),
				value: RelatedSignalsViews.LOGS,
			},
		];

		// Only show Infra option if span has infrastructure metadata
		if (hasInfraMetadata(selectedSpan)) {
			baseOptions.push({
				label: (
					<div className="view-title">
						<BarChart2 size={14} />
						Metrics
					</div>
				),
				value: RelatedSignalsViews.INFRA,
			});
		}

		return baseOptions;
	}, [selectedSpan]);

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

	const { mutate: updateUserPreferenceMutation } = useMutation(
		updateUserPreference,
	);

	// TODO: Span percentile should be eventually moved to context and not fetched on every span change
	const {
		data: userSelectedResourceAttributes,
		isError: isErrorUserSelectedResourceAttributes,
	} = useQuery({
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
		isFetching: isFetchingSpanPercentilesData,
		data,
		refetch: refetchSpanPercentilesData,
		isError: isErrorSpanPercentilesData,
	} = useQuery({
		queryFn: () =>
			getSpanPercentiles({
				start: startTime || 0,
				end: endTime || 0,
				spanDuration: selectedSpan?.durationNano || 0,
				serviceName: selectedSpan?.serviceName || '',
				name: selectedSpan?.name || '',
				resourceAttributes: selectedResourceAttributes,
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
		onSuccess: (response) => {
			if (response.httpStatusCode !== 200) {
				return;
			}

			if (shouldUpdateUserPreference) {
				updateUserPreferenceMutation({
					name: USER_PREFERENCES.SPAN_PERCENTILE_RESOURCE_ATTRIBUTES,
					value: [...Object.keys(selectedResourceAttributes)],
				});

				setShouldUpdateUserPreference(false);
			}
		},
		keepPreviousData: false,
		cacheTime: 0, // no cache
	});

	// Prod Req - Wait for 2 seconds before fetching span percentile data on initial load
	useEffect(() => {
		setSpanPercentileData(null);
		setIsSpanPercentilesOpen(false);
		setInitialWaitCompleted(false);

		const timer = setTimeout(() => {
			setInitialWaitCompleted(true);
		}, 2000); // 2-second delay

		return (): void => {
			// clean the old state around span percentile data
			clearTimeout(timer); // Cleanup on re-run or unmount
		};
	}, [selectedSpan?.spanId]);

	useEffect(() => {
		if (data?.httpStatusCode !== 200) {
			setSpanPercentileData(null);

			return;
		}

		if (data) {
			const percentileData = {
				percentile: data?.data?.position?.percentile || 0,
				description: data?.data?.position?.description || '',
				percentiles: data?.data?.percentiles || {},
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
						key === DEFAULT_RESOURCE_ATTRIBUTES.serviceName ||
						key === DEFAULT_RESOURCE_ATTRIBUTES.name ||
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

		if (isErrorUserSelectedResourceAttributes) {
			const resourceAttributes = Object.entries(selectedSpan?.tagMap || {}).map(
				([key, value]) => ({
					key,
					value,
					isSelected:
						key === DEFAULT_RESOURCE_ATTRIBUTES.serviceName ||
						key === DEFAULT_RESOURCE_ATTRIBUTES.name,
				}),
			);

			updateSpanResourceAttributes(resourceAttributes);

			setShouldFetchSpanPercentilesData(true);
		}
	}, [
		userSelectedResourceAttributes,
		isErrorUserSelectedResourceAttributes,
		selectedSpan?.tagMap,
	]);

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

			setShouldUpdateUserPreference(true);
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
	}, [
		shouldFetchSpanPercentilesData,
		showResourceAttributesSelector,
		initialWaitCompleted,
	]);

	const loadingSpanPercentilesData =
		isLoadingSpanPercentilesData || isFetchingSpanPercentilesData;

	const spanPercentileValue = Math.floor(spanPercentileData?.percentile || 0);

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

								{loadingSpanPercentilesData && (
									<div className="loading-spinner-container">
										<Loader2 size={16} className="animate-spin" />
									</div>
								)}

								{!loadingSpanPercentilesData && spanPercentileData && (
									<Tooltip
										title={isSpanPercentilesOpen ? '' : spanPercentileTooltipText}
										placement="bottomRight"
										overlayClassName="span-percentile-tooltip"
										arrow={false}
									>
										<div
											className={`span-percentile-value-container ${
												isSpanPercentilesOpen
													? 'span-percentile-value-container-open'
													: 'span-percentile-value-container-closed'
											}`}
										>
											<Typography.Text
												className="span-percentile-value"
												onClick={(): void => setIsSpanPercentilesOpen((prev) => !prev)}
												disabled={loadingSpanPercentilesData}
											>
												<span className="span-percentile-value-text">
													p{spanPercentileValue}
												</span>

												{!isSpanPercentilesOpen && (
													<ChevronDown size={16} className="span-percentile-value-icon" />
												)}
												{isSpanPercentilesOpen && (
													<ChevronUp size={16} className="span-percentile-value-icon" />
												)}
											</Typography.Text>
										</div>
									</Tooltip>
								)}
							</div>

							<AnimatePresence initial={false}>
								{isSpanPercentilesOpen && !isErrorSpanPercentilesData && (
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
														data-testid="check-icon"
														size={16}
														className="cursor-pointer span-percentiles-header-icon"
														onClick={(): void => setShowResourceAttributesSelector(false)}
													/>
												) : (
													<PlusIcon
														data-testid="plus-icon"
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
													{!isLoadingSpanPercentilesData &&
													!isFetchingSpanPercentilesData &&
													spanPercentileData ? (
														<span className="span-percentile-value">
															p{Math.floor(spanPercentileData?.percentile || 0)}
														</span>
													) : (
														<span className="span-percentile-value-loader">
															<Loader2 size={12} className="animate-spin" />
														</span>
													)}{' '}
													out of the distribution for this resource evaluated for{' '}
													{selectedTimeRange} hour(s) since the span start time.
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
														{isLoadingSpanPercentilesData || isFetchingSpanPercentilesData ? (
															<Skeleton
																active
																paragraph={{ rows: 3 }}
																className="span-percentile-values-table-data-rows-skeleton"
															/>
														) : (
															<>
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
															</>
														)}
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
								<Button.Group className="related-signals-button-group">
									{relatedSignalsOptions.map((option) => (
										<Button
											key={option.value}
											onClick={(): void => handleRelatedSignalsClick(option.value)}
										>
											{option.label}
										</Button>
									))}
								</Button.Group>
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
