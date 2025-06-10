import { Button, Collapse, Input, Menu, Popover, Typography } from 'antd';
import { ColumnsType } from 'antd/es/table';
import logEvent from 'api/common/logEvent';
import { ResizeTable } from 'components/ResizeTable';
import { DataType } from 'container/LogDetailedView/TableView';
import { useNotifications } from 'hooks/useNotifications';
import { Compass, Copy, Search } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useCopyToClipboard } from 'react-use';

import { PANEL_TYPES } from '../../../constants/queryBuilder';
import ROUTES from '../../../constants/routes';
import { useHandleExplorerTabChange } from '../../../hooks/useHandleExplorerTabChange';
import { MetricsExplorerEventKeys, MetricsExplorerEvents } from '../events';
import { AllAttributesProps, AllAttributesValueProps } from './types';
import { getMetricDetailsQuery } from './utils';

export function AllAttributesValue({
	filterKey,
	filterValue,
	goToMetricsExploreWithAppliedAttribute,
}: AllAttributesValueProps): JSX.Element {
	const [visibleIndex, setVisibleIndex] = useState(5);
	const [attributePopoverKey, setAttributePopoverKey] = useState<string | null>(
		null,
	);
	const [, copyToClipboard] = useCopyToClipboard();
	const { notifications } = useNotifications();

	const handleShowMore = (): void => {
		setVisibleIndex(visibleIndex + 5);
	};

	const handleMenuItemClick = useCallback(
		(key: string, attribute: string): void => {
			switch (key) {
				case 'open-in-explorer':
					goToMetricsExploreWithAppliedAttribute(filterKey, attribute);
					break;
				case 'copy-attribute':
					copyToClipboard(attribute);
					notifications.success({
						message: 'Attribute copied!',
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
			copyToClipboard,
			notifications,
		],
	);

	const attributePopoverContent = useCallback(
		(attribute: string) => (
			<Menu
				items={[
					{
						icon: <Compass size={16} />,
						label: 'Open in Explorer',
						key: 'open-in-explorer',
					},
					{
						icon: <Copy size={16} />,
						label: 'Copy Attribute',
						key: 'copy-attribute',
					},
				]}
				onClick={(info): void => {
					handleMenuItemClick(info.key, attribute);
				}}
			/>
		),
		[handleMenuItemClick],
	);
	return (
		<div className="all-attributes-value">
			{filterValue.slice(0, visibleIndex).map((attribute) => (
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
			{visibleIndex < filterValue.length && (
				<Button type="text" onClick={handleShowMore}>
					Show More
				</Button>
			)}
		</div>
	);
}

function AllAttributes({
	metricName,
	attributes,
	metricType,
}: AllAttributesProps): JSX.Element {
	const [searchString, setSearchString] = useState('');
	const [activeKey, setActiveKey] = useState<string | string[]>(
		'all-attributes',
	);

	const { handleExplorerTabChange } = useHandleExplorerTabChange();

	const goToMetricsExplorerwithAppliedSpaceAggregation = useCallback(
		(groupBy: string) => {
			const compositeQuery = getMetricDetailsQuery(
				metricName,
				metricType,
				undefined,
				groupBy,
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

	const filteredAttributes = useMemo(
		() =>
			attributes.filter(
				(attribute) =>
					attribute.key.toLowerCase().includes(searchString.toLowerCase()) ||
					attribute.value.some((value) =>
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
							value: attribute.value,
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
				render: (field: { label: string; contribution: number }): JSX.Element => (
					<div className="all-attributes-key">
						<Button
							type="text"
							onClick={(): void =>
								goToMetricsExplorerwithAppliedSpaceAggregation(field.label)
							}
						>
							<Typography.Text>{field.label}</Typography.Text>
						</Button>
						<Typography.Text className="all-attributes-contribution">
							{field.contribution}
						</Typography.Text>
					</div>
				),
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
			goToMetricsExplorerwithAppliedSpaceAggregation,
		],
	);

	const items = useMemo(
		() => [
			{
				label: (
					<div className="metrics-accordion-header">
						<Typography.Text>All Attributes</Typography.Text>
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
						/>
					</div>
				),
				key: 'all-attributes',
				children: (
					<ResizeTable
						columns={columns}
						tableLayout="fixed"
						dataSource={tableData}
						pagination={false}
						showHeader={false}
						className="metrics-accordion-content all-attributes-content"
						scroll={{ y: 600 }}
					/>
				),
			},
		],
		[columns, tableData, searchString],
	);

	return (
		<Collapse
			bordered
			className="metrics-accordion metrics-metadata-accordion"
			activeKey={activeKey}
			onChange={(keys): void => setActiveKey(keys)}
			items={items}
		/>
	);
}

export default AllAttributes;
