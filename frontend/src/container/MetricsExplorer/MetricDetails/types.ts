import {
	MetricsexplorertypesMetricAlertDTO,
	MetricsexplorertypesMetricAttributeDTO,
	MetricsexplorertypesMetricDashboardDTO,
	MetricsexplorertypesMetricHighlightsResponseDTO,
	MetricsexplorertypesMetricMetadataDTO,
	MetricsexplorertypesMetricMetadataDTOType,
	MetricsexplorertypesUpdateMetricMetadataRequestDTOTemporality,
	MetricsexplorertypesUpdateMetricMetadataRequestDTOType,
} from 'api/generated/services/sigNoz.schemas';

export interface MetricDetailsProps {
	onClose: () => void;
	isOpen: boolean;
	metricName: string | null;
	isModalTimeSelection: boolean;
	openInspectModal?: (metricName: string) => void;
}

export interface HighlightsProps {
	metricName: string;
}
export interface DashboardsAndAlertsPopoverProps {
	metricName: string;
}

export interface MetadataProps {
	metricName: string;
	metadata: MetricMetadata | null;
	isErrorMetricMetadata: boolean;
	isLoadingMetricMetadata: boolean;
}

export interface AllAttributesProps {
	metricName: string;
	metricType: MetricsexplorertypesMetricMetadataDTOType | undefined;
}

export interface AllAttributesValueProps {
	filterKey: string;
	filterValue: string[];
	goToMetricsExploreWithAppliedAttribute: (key: string, value: string) => void;
}

export type MetricHighlight = MetricsexplorertypesMetricHighlightsResponseDTO;

export type MetricAlert = MetricsexplorertypesMetricAlertDTO;

export type MetricDashboard = MetricsexplorertypesMetricDashboardDTO;

export type MetricMetadata = MetricsexplorertypesMetricMetadataDTO;
export interface MetricMetadataState {
	type: MetricsexplorertypesUpdateMetricMetadataRequestDTOType;
	description: string;
	temporality?: MetricsexplorertypesUpdateMetricMetadataRequestDTOTemporality;
	unit: string;
}

export type MetricAttribute = MetricsexplorertypesMetricAttributeDTO;

export enum TableFields {
	DESCRIPTION = 'description',
	UNIT = 'unit',
	TYPE = 'type',
	Temporality = 'temporality',
	IS_MONOTONIC = 'isMonotonic',
}
