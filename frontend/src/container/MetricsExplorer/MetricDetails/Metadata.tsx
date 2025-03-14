import { Button, Collapse, Input, Select, Typography } from 'antd';
import { ColumnsType } from 'antd/es/table';
import { Temporality } from 'api/metricsExplorer/getMetricDetails';
import { MetricType } from 'api/metricsExplorer/getMetricsList';
import { UpdateMetricMetadataProps } from 'api/metricsExplorer/updateMetricMetadata';
import { ResizeTable } from 'components/ResizeTable';
import FieldRenderer from 'container/LogDetailedView/FieldRenderer';
import { DataType } from 'container/LogDetailedView/TableView';
import { useUpdateMetricMetadata } from 'hooks/metricsExplorer/useUpdateMetricMetadata';
import { useNotifications } from 'hooks/useNotifications';
import { Edit2, Save } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

import { METRIC_TYPE_LABEL_MAP } from '../Summary/constants';
import { MetricTypeRenderer } from '../Summary/utils';
import { METRIC_METADATA_KEYS } from './constants';
import { MetadataProps } from './types';
import { determineIsMonotonic } from './utils';

function Metadata({
	metricName,
	metadata,
	refetchMetricDetails,
}: MetadataProps): JSX.Element {
	const [isEditing, setIsEditing] = useState(false);
	const [
		metricMetadata,
		setMetricMetadata,
	] = useState<UpdateMetricMetadataProps>({
		metricType: metadata?.metric_type || MetricType.SUM,
		description: metadata?.description || '',
		unit: metadata?.unit || '',
		temporality: metadata?.temporality || Temporality.CUMULATIVE,
	});
	const { notifications } = useNotifications();
	const {
		mutate: updateMetricMetadata,
		isLoading: isUpdatingMetricsMetadata,
	} = useUpdateMetricMetadata();
	const [activeKey, setActiveKey] = useState<string | string[]>(
		'metric-metadata',
	);

	const tableData = useMemo(
		() =>
			metadata
				? Object.keys(metadata)
						// Filter out isMonotonic as user input is not required
						.filter((key) => key !== 'isMonotonic')
						.map((key) => ({
							key,
							value: {
								value: metadata[key as keyof typeof metadata],
								key,
							},
						}))
				: [],
		[metadata],
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
				render: (field: string): JSX.Element => (
					<FieldRenderer
						field={METRIC_METADATA_KEYS[field as keyof typeof METRIC_METADATA_KEYS]}
					/>
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
				render: (field: { value: string; key: string }): JSX.Element => {
					if (!isEditing) {
						if (field.key === 'metric_type') {
							return (
								<div>
									<MetricTypeRenderer type={field.value as MetricType} />
								</div>
							);
						}
						return <FieldRenderer field={field.value || '-'} />;
					}
					if (field.key === 'metric_type') {
						return (
							<Select
								options={Object.entries(METRIC_TYPE_LABEL_MAP).map(([key, value]) => ({
									value: key,
									label: value,
								}))}
								value={metricMetadata.metricType}
								onChange={(value): void => {
									setMetricMetadata({
										...metricMetadata,
										metricType: value as MetricType,
									});
								}}
							/>
						);
					}
					if (field.key === 'temporality') {
						return (
							<Select
								options={Object.values(Temporality).map((key) => ({
									value: key,
									label: key,
								}))}
								value={metricMetadata.temporality}
								onChange={(value): void => {
									setMetricMetadata({
										...metricMetadata,
										temporality: value as Temporality,
									});
								}}
							/>
						);
					}
					return (
						<Input
							name={field.key}
							value={
								metricMetadata[
									field.key as Exclude<keyof UpdateMetricMetadataProps, 'isMonotonic'>
								]
							}
							onChange={(e): void => {
								setMetricMetadata({ ...metricMetadata, [field.key]: e.target.value });
							}}
						/>
					);
				},
			},
		],
		[isEditing, metricMetadata, setMetricMetadata],
	);

	const handleSave = useCallback(() => {
		updateMetricMetadata(
			{
				metricName,
				payload: {
					...metricMetadata,
					isMonotonic: determineIsMonotonic(
						metricMetadata.metricType,
						metricMetadata.temporality,
					),
				},
			},
			{
				onSuccess: (response): void => {
					if (response?.payload?.success) {
						notifications.success({
							message: 'Metadata updated successfully',
						});
						refetchMetricDetails();
						setIsEditing(false);
					} else {
						notifications.error({
							message: 'Failed to update metadata',
						});
					}
				},
				onError: (): void =>
					notifications.error({
						message: 'Failed to update metadata',
					}),
			},
		);
	}, [
		updateMetricMetadata,
		metricName,
		metricMetadata,
		notifications,
		refetchMetricDetails,
	]);

	const actionButton = useMemo(() => {
		if (isEditing) {
			return (
				<Button
					className="action-button"
					type="text"
					onClick={(e): void => {
						e.stopPropagation();
						handleSave();
					}}
					disabled={isUpdatingMetricsMetadata}
				>
					<Save size={14} />
					<Typography.Text>Save</Typography.Text>
				</Button>
			);
		}
		return (
			<Button
				className="action-button"
				type="text"
				onClick={(e): void => {
					e.stopPropagation();
					setIsEditing(true);
				}}
				disabled={isUpdatingMetricsMetadata}
			>
				<Edit2 size={14} />
				<Typography.Text>Edit</Typography.Text>
			</Button>
		);
	}, [handleSave, isEditing, isUpdatingMetricsMetadata]);

	const items = useMemo(
		() => [
			{
				label: (
					<div className="metrics-accordion-header metrics-metadata-header">
						<Typography.Text>Metadata</Typography.Text>
						{actionButton}
					</div>
				),
				key: 'metric-metadata',
				children: (
					<ResizeTable
						columns={columns}
						tableLayout="fixed"
						dataSource={tableData}
						pagination={false}
						showHeader={false}
						className="metrics-accordion-content metrics-metadata-container"
					/>
				),
			},
		],
		[actionButton, columns, tableData],
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

export default Metadata;
