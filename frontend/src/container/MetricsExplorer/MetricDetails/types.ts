import {
	MetricsexplorertypesMetricAlertDTO,
	MetricsexplorertypesMetricAttributeDTO,
	MetricsexplorertypesMetricDashboardDTO,
	MetricsexplorertypesMetricHighlightsResponseDTO,
	MetricsexplorertypesMetricMetadataDTO,
	MetrictypesTemporalityDTO,
	MetrictypesTypeDTO,
} from 'api/generated/services/sigNoz.schemas';

export interface MetricDetailsProps {
	onClose: () => void;
	isOpen: boolean;
	metricName: string;
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
	refetchMetricMetadata: () => void;
}

export interface AllAttributesProps {
	metricName: string;
	metricType: MetrictypesTypeDTO | undefined;
}

export interface AllAttributesValueProps {
	filterKey: string;
	filterValue: string[];
	goToMetricsExploreWithAppliedAttribute: (key: string, value: string) => void;
}

export interface AllAttributesEmptyTextProps {
	isErrorAttributes: boolean;
	refetchAttributes: () => void;
}

export type MetricHighlight = MetricsexplorertypesMetricHighlightsResponseDTO;

export type MetricAlert = MetricsexplorertypesMetricAlertDTO;

export type MetricDashboard = MetricsexplorertypesMetricDashboardDTO;

export type MetricMetadata = MetricsexplorertypesMetricMetadataDTO;
export interface MetricMetadataFormState {
	type: MetrictypesTypeDTO;
	description: string;
	temporality?: MetrictypesTemporalityDTO;
	unit: string;
	isMonotonic: boolean;
}

export type MetricAttribute = MetricsexplorertypesMetricAttributeDTO;

export enum TableFields {
	DESCRIPTION = 'description',
	UNIT = 'unit',
	TYPE = 'type',
	Temporality = 'temporality',
	IS_MONOTONIC = 'isMonotonic',
}

export interface MetricDetailsErrorStateProps {
	refetch?: () => void;
	errorMessage: string;
}
