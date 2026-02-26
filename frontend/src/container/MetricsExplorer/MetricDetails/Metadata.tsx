import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from 'react-query';
import { Button, Collapse, Input, Select, Skeleton, Typography } from 'antd';
import { ColumnsType } from 'antd/es/table';
import logEvent from 'api/common/logEvent';
import {
	invalidateGetMetricMetadata,
	invalidateListMetrics,
	useUpdateMetricMetadata,
} from 'api/generated/services/metrics';
import {
	MetrictypesTemporalityDTO,
	MetrictypesTypeDTO,
	RenderErrorResponseDTO,
} from 'api/generated/services/sigNoz.schemas';
import { AxiosError } from 'axios';
import { ResizeTable } from 'components/ResizeTable';
import YAxisUnitSelector from 'components/YAxisUnitSelector';
import { YAxisSource } from 'components/YAxisUnitSelector/types';
import { getUniversalNameFromMetricUnit } from 'components/YAxisUnitSelector/utils';
import FieldRenderer from 'container/LogDetailedView/FieldRenderer';
import { DataType } from 'container/LogDetailedView/TableView';
import { useNotifications } from 'hooks/useNotifications';
import { Edit2, Save, X } from 'lucide-react';

import { MetricsExplorerEventKeys, MetricsExplorerEvents } from '../events';
import { MetricTypeViewRenderer } from '../Summary/utils';
import {
	METRIC_METADATA_KEYS,
	METRIC_METADATA_TEMPORALITY_OPTIONS,
	METRIC_METADATA_TYPE_OPTIONS,
	METRIC_METADATA_UPDATE_ERROR_MESSAGE,
} from './constants';
import MetricDetailsErrorState from './MetricDetailsErrorState';
import { MetadataProps, MetricMetadataFormState, TableFields } from './types';
import { transformUpdateMetricMetadataRequest } from './utils';

function Metadata({
	metricName,
	metadata,
	isErrorMetricMetadata,
	isLoadingMetricMetadata,
	refetchMetricMetadata,
}: MetadataProps): JSX.Element {
	const [isEditing, setIsEditing] = useState(false);

	const [
		metricMetadataState,
		setMetricMetadataState,
	] = useState<MetricMetadataFormState>({
		type: MetrictypesTypeDTO.sum,
		description: '',
		temporality: MetrictypesTemporalityDTO.unspecified,
		unit: '',
		isMonotonic: false,
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
			setMetricMetadataState({
				type: metadata.type,
				description: metadata.description,
				temporality: metadata.temporality,
				unit: metadata.unit,
				isMonotonic: metadata.isMonotonic,
			});
		}
	}, [metadata]);

	const tableData = useMemo(
		() =>
			metadata
				? Object.keys(metadata).map((key) => ({
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
		(key: keyof MetricMetadataFormState, value: string) => {
			if (isErrorMetricMetadata) {
				return <FieldRenderer field="-" />;
			}
			if (key === TableFields.TYPE) {
				return <MetricTypeViewRenderer type={value as MetrictypesTypeDTO} />;
			}
			if (key === TableFields.IS_MONOTONIC) {
				return <FieldRenderer field={value ? 'Yes' : 'No'} />;
			}
			if (key === TableFields.Temporality) {
				const temporality = METRIC_METADATA_TEMPORALITY_OPTIONS.find(
					(option) => option.value === value,
				);
				return <FieldRenderer field={temporality?.label || '-'} />;
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
		(field: {
			value: string;
			key: keyof MetricMetadataFormState;
		}): JSX.Element => {
			if (!isEditing) {
				return renderUneditableField(field.key, field.value);
			}

			// Don't allow editing of unit if it's already set
			const metricUnitAlreadySet =
				field.key === TableFields.UNIT && Boolean(metadata?.unit);
			if (metricUnitAlreadySet) {
				return renderUneditableField(field.key, field.value);
			}

			// Monotonic is not editable
			if (field.key === TableFields.IS_MONOTONIC) {
				return renderUneditableField(field.key, field.value);
			}

			if (field.key === TableFields.TYPE) {
				return (
					<Select
						data-testid="metric-type-select"
						options={METRIC_METADATA_TYPE_OPTIONS}
						value={metricMetadataState.type}
						onChange={(value): void => {
							setMetricMetadataState((prev) => ({
								...prev,
								type: value,
							}));
						}}
					/>
				);
			}
			if (field.key === TableFields.UNIT) {
				return (
					<YAxisUnitSelector
						value={metricMetadataState.unit}
						onChange={(value): void => {
							setMetricMetadataState((prev) => ({ ...prev, unit: value }));
						}}
						data-testid="unit-select"
						source={YAxisSource.EXPLORER}
					/>
				);
			}
			if (field.key === TableFields.Temporality) {
				const temporalityValue =
					metricMetadataState.temporality === MetrictypesTemporalityDTO.unspecified
						? undefined
						: metricMetadataState.temporality;
				return (
					<Select
						data-testid="temporality-select"
						options={METRIC_METADATA_TEMPORALITY_OPTIONS}
						value={temporalityValue}
						onChange={(value): void => {
							setMetricMetadataState((prev) => ({
								...prev,
								temporality: value,
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
						defaultValue={metricMetadataState.description}
						onChange={(e): void => {
							setMetricMetadataState((prev) => ({
								...prev,
								[field.key]: e.target.value,
							}));
						}}
					/>
				);
			}
			return <FieldRenderer field="-" />;
		},
		[isEditing, metadata?.unit, metricMetadataState, renderUneditableField],
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
				pathParams: {
					metricName,
				},
				data: transformUpdateMetricMetadataRequest(metricName, metricMetadataState),
			},
			{
				onSuccess: (): void => {
					logEvent(MetricsExplorerEvents.MetricMetadataUpdated, {
						[MetricsExplorerEventKeys.MetricName]: metricName,
						[MetricsExplorerEventKeys.Tab]: 'summary',
						[MetricsExplorerEventKeys.Modal]: 'metric-details',
					});
					notifications.success({
						message: 'Metadata updated successfully',
					});
					setIsEditing(false);
					invalidateListMetrics(queryClient);
					invalidateGetMetricMetadata(queryClient, {
						metricName,
					});
				},
				onError: (error): void => {
					const errorMessage = (error as AxiosError<RenderErrorResponseDTO>).response
						?.data.error?.message;
					notifications.error({
						message: errorMessage || METRIC_METADATA_UPDATE_ERROR_MESSAGE,
					});
				},
			},
		);
	}, [
		updateMetricMetadata,
		metricName,
		metricMetadataState,
		notifications,
		queryClient,
	]);

	const cancelEdit = useCallback(
		(e: React.MouseEvent<HTMLElement, MouseEvent>): void => {
			e.stopPropagation();
			if (metadata) {
				setMetricMetadataState({
					type: metadata.type,
					description: metadata.description,
					unit: metadata.unit,
					temporality: metadata.temporality,
					isMonotonic: metadata.isMonotonic,
				});
			}
			setIsEditing(false);
		},
		[metadata],
	);

	const actionButton = useMemo(() => {
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
		if (isErrorMetricMetadata) {
			return null;
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
		isEditing,
		isErrorMetricMetadata,
		isUpdatingMetricsMetadata,
		cancelEdit,
		handleSave,
	]);

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
				children: isErrorMetricMetadata ? (
					<div className="metric-metadata-error-state">
						<MetricDetailsErrorState
							refetch={refetchMetricMetadata}
							errorMessage="Something went wrong while fetching metric metadata"
						/>
					</div>
				) : (
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
		[
			actionButton,
			columns,
			isErrorMetricMetadata,
			refetchMetricMetadata,
			tableData,
		],
	);

	if (isLoadingMetricMetadata) {
		return (
			<div className="metrics-metadata-skeleton-container">
				<Skeleton active paragraph={{ rows: 8 }} />
			</div>
		);
	}

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
