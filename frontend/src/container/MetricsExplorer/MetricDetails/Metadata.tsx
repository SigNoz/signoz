import { Button, Collapse, Input, Select, Skeleton, Typography } from 'antd';
import { ColumnsType } from 'antd/es/table';
import logEvent from 'api/common/logEvent';
import { Temporality } from 'api/metricsExplorer/getMetricDetails';
import { MetricType } from 'api/metricsExplorer/getMetricsList';
import { ResizeTable } from 'components/ResizeTable';
import YAxisUnitSelector from 'components/YAxisUnitSelector';
import { YAxisSource } from 'components/YAxisUnitSelector/types';
import { getUniversalNameFromMetricUnit } from 'components/YAxisUnitSelector/utils';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import FieldRenderer from 'container/LogDetailedView/FieldRenderer';
import { DataType } from 'container/LogDetailedView/TableView';
import { useUpdateMetricMetadata } from 'hooks/metricsExplorer/v2/useUpdateMetricMetadata';
import { useNotifications } from 'hooks/useNotifications';
import { Edit2, Save, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from 'react-query';

import { MetricsExplorerEventKeys, MetricsExplorerEvents } from '../events';
import {
	METRIC_TYPE_LABEL_MAP,
	METRIC_TYPE_VALUES_MAP,
} from '../Summary/constants';
import { MetricTypeRenderer } from '../Summary/utils';
import { METRIC_METADATA_KEYS } from './constants';
import { MetadataProps, MetricMetadataState, TableFields } from './types';
import { transformUpdateMetricMetadataRequest } from './utils';

function Metadata({
	metricName,
	metadata,
	isErrorMetricMetadata,
	isLoadingMetricMetadata,
}: MetadataProps): JSX.Element {
	const [isEditing, setIsEditing] = useState(false);

	const [metricMetadata, setMetricMetadata] = useState<MetricMetadataState>({
		metricType: MetricType.SUM,
		description: '',
		temporality: undefined,
		unit: undefined,
	});
	const { notifications } = useNotifications();
	const {
		mutate: updateMetricMetadata,
		isLoading: isUpdatingMetricsMetadata,
	} = useUpdateMetricMetadata();
	const [activeKey, setActiveKey] = useState<string | string[]>(
		'metric-metadata',
	);
	const queryClient = useQueryClient();

	// Initialize state from metadata api data
	useEffect(() => {
		if (metadata) {
			setMetricMetadata({
				metricType: metadata.metricType,
				description: metadata.description,
				temporality: metadata.temporality,
				unit: metadata.unit,
			});
		}
	}, [metadata]);

	const tableData = useMemo(
		() =>
			metadata
				? Object.keys({
						...metadata,
						temporality: metadata?.temporality,
				  })
						// Filter out monotonic as user input is not required
						.filter((key) => key !== TableFields.IS_MONOTONIC)
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

	// Render un-editable field value
	const renderUneditableField = useCallback(
		(key: keyof MetricMetadataState, value: string) => {
			if (isErrorMetricMetadata) {
				return <FieldRenderer field="-" />;
			}
			if (key === TableFields.METRIC_TYPE) {
				return <MetricTypeRenderer type={value as MetricType} />;
			}
			let fieldValue = value;
			if (key === TableFields.UNIT) {
				fieldValue = getUniversalNameFromMetricUnit(value);
			}
			return <FieldRenderer field={fieldValue || '-'} />;
		},
		[isErrorMetricMetadata],
	);

	const renderColumnValue = useCallback(
		(field: { value: string; key: keyof MetricMetadataState }): JSX.Element => {
			if (!isEditing) {
				return renderUneditableField(field.key, field.value);
			}

			// Don't allow editing of unit if it's already set
			const metricUnitAlreadySet =
				field.key === TableFields.UNIT && Boolean(metadata?.unit);
			if (metricUnitAlreadySet) {
				return renderUneditableField(field.key, field.value);
			}

			if (field.key === TableFields.METRIC_TYPE) {
				return (
					<Select
						data-testid="metric-type-select"
						options={Object.entries(METRIC_TYPE_VALUES_MAP).map(([key]) => ({
							value: key,
							label: METRIC_TYPE_LABEL_MAP[key as MetricType],
						}))}
						value={metricMetadata.metricType}
						onChange={(value): void => {
							setMetricMetadata((prev) => ({
								...prev,
								metricType: value as MetricType,
							}));
						}}
					/>
				);
			}
			if (field.key === TableFields.UNIT) {
				return (
					<YAxisUnitSelector
						value={metricMetadata.unit}
						onChange={(value): void => {
							setMetricMetadata((prev) => ({ ...prev, unit: value }));
						}}
						data-testid="unit-select"
						source={YAxisSource.EXPLORER}
					/>
				);
			}
			if (field.key === TableFields.Temporality) {
				return (
					<Select
						data-testid="temporality-select"
						options={Object.values(Temporality).map((key) => ({
							value: key,
							label: key,
						}))}
						value={metricMetadata.temporality}
						onChange={(value): void => {
							setMetricMetadata((prev) => ({
								...prev,
								temporality: value as Temporality,
							}));
						}}
					/>
				);
			}
			if (field.key === TableFields.DESCRIPTION) {
				return (
					<Input
						data-testid="description-input"
						name={field.key}
						defaultValue={metricMetadata.description}
						onChange={(e): void => {
							setMetricMetadata((prev) => ({
								...prev,
								[field.key]: e.target.value,
							}));
						}}
					/>
				);
			}
			return <FieldRenderer field="-" />;
		},
		[isEditing, metadata?.unit, metricMetadata, renderUneditableField],
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
						field={
							METRIC_METADATA_KEYS[field as keyof typeof METRIC_METADATA_KEYS] || ''
						}
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
				render: renderColumnValue,
			},
		],
		[renderColumnValue],
	);

	const handleSave = useCallback(() => {
		updateMetricMetadata(
			{
				metricName,
				payload: transformUpdateMetricMetadataRequest(metricMetadata),
			},
			{
				onSuccess: (response): void => {
					if (response?.httpStatusCode === 200) {
						logEvent(MetricsExplorerEvents.MetricMetadataUpdated, {
							[MetricsExplorerEventKeys.MetricName]: metricName,
							[MetricsExplorerEventKeys.Tab]: 'summary',
							[MetricsExplorerEventKeys.Modal]: 'metric-details',
						});
						notifications.success({
							message: 'Metadata updated successfully',
						});
						setIsEditing(false);
						queryClient.invalidateQueries([REACT_QUERY_KEY.GET_METRICS_LIST]);
						queryClient.invalidateQueries([
							REACT_QUERY_KEY.GET_METRIC_METADATA,
							metricName,
						]);
					} else {
						notifications.error({
							message:
								'Failed to update metadata, please try again. If the issue persists, please contact support.',
						});
					}
				},
				onError: (): void =>
					notifications.error({
						message:
							'Failed to update metadata, please try again. If the issue persists, please contact support.',
					}),
			},
		);
	}, [
		updateMetricMetadata,
		metricName,
		metricMetadata,
		notifications,
		queryClient,
	]);

	const cancelEdit = useCallback(
		(e: React.MouseEvent<HTMLElement, MouseEvent>): void => {
			e.stopPropagation();
			if (metadata) {
				setMetricMetadata({
					metricType: metadata.metricType,
					description: metadata.description,
					temporality: metadata.temporality,
					unit: metadata.unit,
				});
			}
			setIsEditing(false);
		},
		[metadata],
	);

	const actionButton = useMemo(() => {
		if (isLoadingMetricMetadata) {
			return null;
		}
		if (isEditing) {
			return (
				<div className="action-menu">
					<Button
						className="action-button"
						type="text"
						onClick={cancelEdit}
						disabled={isUpdatingMetricsMetadata}
					>
						<X size={14} />
						<Typography.Text>Cancel</Typography.Text>
					</Button>
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
				</div>
			);
		}
		return (
			<div className="action-menu">
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
			</div>
		);
	}, [
		isLoadingMetricMetadata,
		isEditing,
		isUpdatingMetricsMetadata,
		cancelEdit,
		handleSave,
	]);

	const items = useMemo(() => {
		let children;
		if (isLoadingMetricMetadata) {
			children = (
				<div className="metrics-metadata-skeleton-container">
					<Skeleton active title={false} paragraph={{ rows: 8 }} />
				</div>
			);
		} else {
			children = (
				<ResizeTable
					columns={columns}
					tableLayout="fixed"
					dataSource={tableData}
					pagination={false}
					showHeader={false}
					className="metrics-accordion-content metrics-metadata-container"
				/>
			);
		}
		return [
			{
				label: (
					<div className="metrics-accordion-header metrics-metadata-header">
						<Typography.Text>Metadata</Typography.Text>
						{actionButton}
					</div>
				),
				key: 'metric-metadata',
				children,
			},
		];
	}, [actionButton, columns, isLoadingMetricMetadata, tableData]);

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
