import { Button, Collapse, Input, Typography } from 'antd';
import { ColumnsType } from 'antd/es/table';
import { ResizeTable } from 'components/ResizeTable';
import ROUTES from 'constants/routes';
import { DataType } from 'container/LogDetailedView/TableView';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import { Search } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

import { AllAttributesProps } from './types';
import { getMetricDetailsQuery } from './utils';

function AllAttributes({
	attributes,
	metricName,
}: AllAttributesProps): JSX.Element {
	const [searchString, setSearchString] = useState('');
	const [activeKey, setActiveKey] = useState<string | string[]>(
		'all-attributes',
	);

	const { safeNavigate } = useSafeNavigate();

	const goToMetricsExploreWithAppliedAttribute = useCallback(
		(key: string, value: string) => {
			const compositeQuery = getMetricDetailsQuery(metricName, { key, value });
			const encodedCompositeQuery = JSON.stringify(compositeQuery);
			safeNavigate(
				`${ROUTES.METRICS_EXPLORER_EXPLORER}?compositeQuery=${encodedCompositeQuery}`,
			);
		},
		[metricName, safeNavigate],
	);

	const filteredAttributes = useMemo(
		() =>
			attributes.filter((attribute) =>
				attribute.key.toLowerCase().includes(searchString.toLowerCase()),
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
						<Typography.Text>{field.label}</Typography.Text>
						<Typography.Text>{field.contribution}</Typography.Text>
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
					<div className="all-attributes-value">
						{field.value.map((attribute) => (
							<Button
								key={attribute}
								type="text"
								onClick={(): void => {
									goToMetricsExploreWithAppliedAttribute(field.key, attribute);
								}}
							>
								<Typography.Text>{attribute}</Typography.Text>
							</Button>
						))}
					</div>
				),
			},
		],
		[goToMetricsExploreWithAppliedAttribute],
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
