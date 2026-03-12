import { useCallback, useMemo, useRef, useState } from 'react';
import { useCopyToClipboard } from 'react-use';
import type { TableColumnsType as ColumnsType } from 'antd';
import {
	Button,
	Collapse,
	Input,
	Menu,
	Popover,
	Tooltip,
	Typography,
} from 'antd';
import logEvent from 'api/common/logEvent';
import { useGetMetricAttributes } from 'api/generated/services/metrics';
import { ResizeTable } from 'components/ResizeTable';
import { DataType } from 'container/LogDetailedView/TableView';
import { Check, Copy, Info, Search, SquareArrowOutUpRight } from 'lucide-react';

import { PANEL_TYPES } from '../../../constants/queryBuilder';
import ROUTES from '../../../constants/routes';
import { useHandleExplorerTabChange } from '../../../hooks/useHandleExplorerTabChange';
import { MetricsExplorerEventKeys, MetricsExplorerEvents } from '../events';
import {
	AllAttributesEmptyText,
	AllAttributesValue,
} from './AllAttributesValue';
import { AllAttributesProps } from './types';
import { getMetricDetailsQuery } from './utils';

const ALL_ATTRIBUTES_KEY = 'all-attributes';
const COPY_FEEDBACK_DURATION_MS = 1500;

function AllAttributes({
	metricName,
	metricType,
	isMonotonic,
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
				isMonotonic,
			);
			handleExplorerTabChange(
				PANEL_TYPES.TIME_SERIES,
				{
					query: compositeQuery,
					name: metricName,
					id: metricName,
				},
				ROUTES.METRICS_EXPLORER_EXPLORER,
				true,
			);
			logEvent(MetricsExplorerEvents.OpenInExplorerClicked, {
				[MetricsExplorerEventKeys.MetricName]: metricName,
				[MetricsExplorerEventKeys.Tab]: 'summary',
				[MetricsExplorerEventKeys.Modal]: 'metric-details',
				[MetricsExplorerEventKeys.AttributeKey]: groupBy,
			});
		},
		[metricName, metricType, isMonotonic, handleExplorerTabChange],
	);

	const goToMetricsExploreWithAppliedAttribute = useCallback(
		(key: string, value: string) => {
			const compositeQuery = getMetricDetailsQuery(
				metricName,
				metricType,
				{ key, value },
				undefined,
				undefined,
				isMonotonic,
			);
			handleExplorerTabChange(
				PANEL_TYPES.TIME_SERIES,
				{
					query: compositeQuery,
					name: metricName,
					id: metricName,
				},
				ROUTES.METRICS_EXPLORER_EXPLORER,
				true,
			);
			logEvent(MetricsExplorerEvents.OpenInExplorerClicked, {
				[MetricsExplorerEventKeys.MetricName]: metricName,
				[MetricsExplorerEventKeys.Tab]: 'summary',
				[MetricsExplorerEventKeys.Modal]: 'metric-details',
				[MetricsExplorerEventKeys.AttributeKey]: key,
				[MetricsExplorerEventKeys.AttributeValue]: value,
			});
		},
		[metricName, metricType, isMonotonic, handleExplorerTabChange],
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
								overlayClassName="metric-details-popover attribute-key-popover-overlay"
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
