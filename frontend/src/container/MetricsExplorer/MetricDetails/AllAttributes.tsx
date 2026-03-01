import { useCallback, useMemo, useRef, useState } from 'react';
import { useCopyToClipboard } from 'react-use';
import {
	Button,
	Collapse,
	Input,
	Menu,
	Popover,
	Tooltip,
	Typography,
} from 'antd';
import { ColumnsType } from 'antd/es/table';
import logEvent from 'api/common/logEvent';
import { useGetMetricAttributes } from 'api/generated/services/metrics';
import { ResizeTable } from 'components/ResizeTable';
import { DataType } from 'container/LogDetailedView/TableView';
import { useNotifications } from 'hooks/useNotifications';
import { Check, Copy, Info, Search, SquareArrowOutUpRight } from 'lucide-react';

import { PANEL_TYPES } from '../../../constants/queryBuilder';
import ROUTES from '../../../constants/routes';
import { useHandleExplorerTabChange } from '../../../hooks/useHandleExplorerTabChange';
import { MetricsExplorerEventKeys, MetricsExplorerEvents } from '../events';
import MetricDetailsErrorState from './MetricDetailsErrorState';
import {
	AllAttributesEmptyTextProps,
	AllAttributesProps,
	AllAttributesValueProps,
} from './types';
import { getMetricDetailsQuery } from './utils';

const ALL_ATTRIBUTES_KEY = 'all-attributes';
const INITIAL_VISIBLE_COUNT = 5;
const COPY_FEEDBACK_DURATION_MS = 1500;

function AllAttributesEmptyText({
	isErrorAttributes,
	refetchAttributes,
}: AllAttributesEmptyTextProps): JSX.Element {
	if (isErrorAttributes) {
		return (
			<div className="all-attributes-error-state">
				<MetricDetailsErrorState
					refetch={refetchAttributes}
					errorMessage="Something went wrong while fetching attributes"
				/>
			</div>
		);
	}
	return <Typography.Text>No attributes found</Typography.Text>;
}

export function AllAttributesValue({
	filterKey,
	filterValue,
	goToMetricsExploreWithAppliedAttribute,
}: AllAttributesValueProps): JSX.Element {
	const [attributePopoverKey, setAttributePopoverKey] = useState<string | null>(
		null,
	);
	const [allValuesOpen, setAllValuesOpen] = useState(false);
	const [allValuesSearch, setAllValuesSearch] = useState('');
	const [copiedValue, setCopiedValue] = useState<string | null>(null);
	const [, copyToClipboard] = useCopyToClipboard();
	const { notifications } = useNotifications();
	const copyTimerRef = useRef<ReturnType<typeof setTimeout>>();

	const handleCopyWithFeedback = useCallback(
		(value: string): void => {
			copyToClipboard(value);
			setCopiedValue(value);
			clearTimeout(copyTimerRef.current);
			copyTimerRef.current = setTimeout(() => {
				setCopiedValue(null);
			}, COPY_FEEDBACK_DURATION_MS);
		},
		[copyToClipboard],
	);

	const handleMenuItemClick = useCallback(
		(key: string, attribute: string): void => {
			switch (key) {
				case 'open-in-explorer':
					goToMetricsExploreWithAppliedAttribute(filterKey, attribute);
					break;
				case 'copy-value':
					handleCopyWithFeedback(attribute);
					notifications.success({
						message: 'Value copied!',
					});
					break;
				default:
					break;
			}
			setAttributePopoverKey(null);
		},
		[
			goToMetricsExploreWithAppliedAttribute,
			filterKey,
			handleCopyWithFeedback,
			notifications,
		],
	);

	const attributePopoverContent = useCallback(
		(attribute: string) => (
			<Menu
				items={[
					{
						icon: <SquareArrowOutUpRight size={14} />,
						label: 'Open in Metric Explorer',
						key: 'open-in-explorer',
					},
					{
						icon: <Copy size={14} />,
						label: 'Copy Value',
						key: 'copy-value',
					},
				]}
				onClick={(info): void => {
					handleMenuItemClick(info.key, attribute);
				}}
			/>
		),
		[handleMenuItemClick],
	);

	const filteredAllValues = useMemo(
		() =>
			allValuesSearch
				? filterValue.filter((v) =>
						v.toLowerCase().includes(allValuesSearch.toLowerCase()),
				  )
				: filterValue,
		[filterValue, allValuesSearch],
	);

	const allValuesPopoverContent = (
		<div className="all-values-popover">
			<Input
				placeholder="Search values"
				size="small"
				prefix={<Search size={12} />}
				value={allValuesSearch}
				onChange={(e): void => setAllValuesSearch(e.target.value)}
				allowClear
			/>
			<div className="all-values-list">
				{allValuesOpen &&
					filteredAllValues.map((attribute) => {
						const isCopied = copiedValue === attribute;
						return (
							<div key={attribute} className="all-values-item">
								<Typography.Text ellipsis className="all-values-item-text">
									{attribute}
								</Typography.Text>
								<div className="all-values-item-actions">
									<Tooltip title={isCopied ? 'Copied!' : 'Copy value'}>
										<Button
											type="text"
											size="small"
											className={isCopied ? 'copy-success' : ''}
											icon={isCopied ? <Check size={12} /> : <Copy size={12} />}
											onClick={(): void => {
												handleCopyWithFeedback(attribute);
											}}
										/>
									</Tooltip>
									<Tooltip title="Open in Metric Explorer">
										<Button
											type="text"
											size="small"
											icon={<SquareArrowOutUpRight size={12} />}
											onClick={(): void => {
												goToMetricsExploreWithAppliedAttribute(filterKey, attribute);
												setAllValuesOpen(false);
											}}
										/>
									</Tooltip>
								</div>
							</div>
						);
					})}
				{allValuesOpen && filteredAllValues.length === 0 && (
					<Typography.Text type="secondary" className="all-values-empty">
						No values found
					</Typography.Text>
				)}
			</div>
		</div>
	);

	return (
		<div className="all-attributes-value">
			{filterValue.slice(0, INITIAL_VISIBLE_COUNT).map((attribute) => (
				<Popover
					key={attribute}
					content={attributePopoverContent(attribute)}
					trigger="click"
					open={attributePopoverKey === `${filterKey}-${attribute}`}
					onOpenChange={(open): void => {
						if (!open) {
							setAttributePopoverKey(null);
						} else {
							setAttributePopoverKey(`${filterKey}-${attribute}`);
						}
					}}
				>
					<Button key={attribute} type="text">
						<Typography.Text>{attribute}</Typography.Text>
					</Button>
				</Popover>
			))}
			{filterValue.length > INITIAL_VISIBLE_COUNT && (
				<Popover
					content={allValuesPopoverContent}
					trigger="click"
					open={allValuesOpen}
					onOpenChange={(open): void => {
						setAllValuesOpen(open);
						if (!open) {
							setAllValuesSearch('');
							setCopiedValue(null);
						}
					}}
					overlayClassName="all-values-popover-overlay"
				>
					<Button type="text" className="all-values-button">
						All values ({filterValue.length})
					</Button>
				</Popover>
			)}
		</div>
	);
}

function AllAttributes({
	metricName,
	metricType,
	minTime,
	maxTime,
}: AllAttributesProps): JSX.Element {
	const [searchString, setSearchString] = useState('');
	const [activeKey, setActiveKey] = useState<string[]>([ALL_ATTRIBUTES_KEY]);
	const [keyPopoverOpen, setKeyPopoverOpen] = useState<string | null>(null);
	const [copiedKey, setCopiedKey] = useState<string | null>(null);
	const [, copyToClipboard] = useCopyToClipboard();
	const copyTimerRef = useRef<ReturnType<typeof setTimeout>>();

	const {
		data: attributesData,
		isLoading: isLoadingAttributes,
		isError: isErrorAttributes,
		refetch: refetchAttributes,
	} = useGetMetricAttributes(
		{
			metricName,
		},
		{
			start: minTime ? Math.floor(minTime / 1000000) : undefined,
			end: maxTime ? Math.floor(maxTime / 1000000) : undefined,
		},
	);

	const attributes = useMemo(() => attributesData?.data.attributes ?? [], [
		attributesData,
	]);

	const { handleExplorerTabChange } = useHandleExplorerTabChange();

	const goToMetricsExplorerwithAppliedSpaceAggregation = useCallback(
		(groupBy: string, valueCount?: number) => {
			const limit = valueCount && valueCount > 250 ? 100 : undefined;
			const compositeQuery = getMetricDetailsQuery(
				metricName,
				metricType,
				undefined,
				groupBy,
				limit,
			);
			handleExplorerTabChange(
				PANEL_TYPES.TIME_SERIES,
				{
					query: compositeQuery,
					name: metricName,
					id: metricName,
				},
				ROUTES.METRICS_EXPLORER_EXPLORER,
			);
			logEvent(MetricsExplorerEvents.OpenInExplorerClicked, {
				[MetricsExplorerEventKeys.MetricName]: metricName,
				[MetricsExplorerEventKeys.Tab]: 'summary',
				[MetricsExplorerEventKeys.Modal]: 'metric-details',
				[MetricsExplorerEventKeys.AttributeKey]: groupBy,
			});
		},
		[metricName, metricType, handleExplorerTabChange],
	);

	const goToMetricsExploreWithAppliedAttribute = useCallback(
		(key: string, value: string) => {
			const compositeQuery = getMetricDetailsQuery(metricName, metricType, {
				key,
				value,
			});
			handleExplorerTabChange(
				PANEL_TYPES.TIME_SERIES,
				{
					query: compositeQuery,
					name: metricName,
					id: metricName,
				},
				ROUTES.METRICS_EXPLORER_EXPLORER,
			);
			logEvent(MetricsExplorerEvents.OpenInExplorerClicked, {
				[MetricsExplorerEventKeys.MetricName]: metricName,
				[MetricsExplorerEventKeys.Tab]: 'summary',
				[MetricsExplorerEventKeys.Modal]: 'metric-details',
				[MetricsExplorerEventKeys.AttributeKey]: key,
				[MetricsExplorerEventKeys.AttributeValue]: value,
			});
		},
		[metricName, metricType, handleExplorerTabChange],
	);

	const handleKeyMenuItemClick = useCallback(
		(menuKey: string, attributeKey: string, valueCount?: number): void => {
			switch (menuKey) {
				case 'open-in-explorer':
					goToMetricsExplorerwithAppliedSpaceAggregation(attributeKey, valueCount);
					break;
				case 'copy-key':
					copyToClipboard(attributeKey);
					setCopiedKey(attributeKey);
					clearTimeout(copyTimerRef.current);
					copyTimerRef.current = setTimeout(() => {
						setCopiedKey(null);
					}, COPY_FEEDBACK_DURATION_MS);
					break;
				default:
					break;
			}
			setKeyPopoverOpen(null);
		},
		[goToMetricsExplorerwithAppliedSpaceAggregation, copyToClipboard],
	);

	const filteredAttributes = useMemo(
		() =>
			attributes.filter(
				(attribute) =>
					attribute.key.toLowerCase().includes(searchString.toLowerCase()) ||
					attribute.values?.some((value) =>
						value.toLowerCase().includes(searchString.toLowerCase()),
					),
			),
		[attributes, searchString],
	);

	const tableData = useMemo(
		() =>
			filteredAttributes
				? filteredAttributes.map((attribute) => ({
						key: {
							label: attribute.key,
							contribution: attribute.valueCount,
						},
						value: {
							key: attribute.key,
							value: attribute.values,
						},
				  }))
				: [],
		[filteredAttributes],
	);

	const columns: ColumnsType<DataType> = useMemo(
		() => [
			{
				title: 'Key',
				dataIndex: 'key',
				key: 'key',
				width: 50,
				align: 'left',
				className: 'metric-metadata-key',
				render: (field: { label: string; contribution: number }): JSX.Element => {
					const isCopied = copiedKey === field.label;
					return (
						<div className="all-attributes-key">
							<Popover
								content={
									<Menu
										items={[
											{
												icon: <SquareArrowOutUpRight size={14} />,
												label: 'Open in Metric Explorer',
												key: 'open-in-explorer',
											},
											{
												icon: <Copy size={14} />,
												label: 'Copy Key',
												key: 'copy-key',
											},
										]}
										onClick={(info): void => {
											handleKeyMenuItemClick(info.key, field.label, field.contribution);
										}}
									/>
								}
								trigger="click"
								placement="right"
								overlayClassName="attribute-key-popover-overlay"
								open={keyPopoverOpen === field.label}
								onOpenChange={(open): void => {
									if (!open) {
										setKeyPopoverOpen(null);
									} else {
										setKeyPopoverOpen(field.label);
									}
								}}
							>
								<Button type="text">
									<Typography.Text>{field.label}</Typography.Text>
								</Button>
							</Popover>
							{isCopied && (
								<span className="copy-feedback">
									<Check size={12} />
								</span>
							)}
							<Typography.Text className="all-attributes-contribution">
								{field.contribution}
							</Typography.Text>
						</div>
					);
				},
			},
			{
				title: 'Value',
				dataIndex: 'value',
				key: 'value',
				width: 50,
				align: 'left',
				ellipsis: true,
				className: 'metric-metadata-value',
				render: (field: { key: string; value: string[] }): JSX.Element => (
					<AllAttributesValue
						filterKey={field.key}
						filterValue={field.value}
						goToMetricsExploreWithAppliedAttribute={
							goToMetricsExploreWithAppliedAttribute
						}
					/>
				),
			},
		],
		[
			goToMetricsExploreWithAppliedAttribute,
			handleKeyMenuItemClick,
			keyPopoverOpen,
			copiedKey,
		],
	);

	const items = useMemo(
		() => [
			{
				label: (
					<div className="metrics-accordion-header">
						<div className="all-attributes-header-title">
							<Typography.Text>All Attributes</Typography.Text>
							<Tooltip title="Showing attributes for the selected time range">
								<Info size={14} />
							</Tooltip>
						</div>
						<Input
							className="all-attributes-search-input"
							placeholder="Search"
							value={searchString}
							size="small"
							suffix={<Search size={12} />}
							onChange={(e): void => {
								setSearchString(e.target.value);
							}}
							onClick={(e): void => {
								e.stopPropagation();
							}}
							disabled={isLoadingAttributes || isErrorAttributes}
						/>
					</div>
				),
				key: 'all-attributes',
				children: (
					<ResizeTable
						columns={columns}
						loading={isLoadingAttributes}
						tableLayout="fixed"
						dataSource={tableData}
						pagination={false}
						showHeader={false}
						className="metrics-accordion-content all-attributes-content"
						scroll={{ y: 600 }}
						locale={{
							emptyText: isLoadingAttributes ? (
								' '
							) : (
								<AllAttributesEmptyText
									isErrorAttributes={isErrorAttributes}
									refetchAttributes={refetchAttributes}
								/>
							),
						}}
					/>
				),
			},
		],
		[
			searchString,
			isLoadingAttributes,
			isErrorAttributes,
			columns,
			tableData,
			refetchAttributes,
		],
	);

	return (
		<Collapse
			bordered
			className="metrics-accordion"
			activeKey={activeKey}
			onChange={(keys): void => setActiveKey(keys as string[])}
			items={items}
		/>
	);
}

export default AllAttributes;
