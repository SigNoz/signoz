import { Temporality } from 'api/metricsExplorer/getMetricDetails';
import { MetricType } from 'api/metricsExplorer/getMetricsList';

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
	metricType: MetricType | undefined;
}

export interface AllAttributesValueProps {
	filterKey: string;
	filterValue: string[];
	goToMetricsExploreWithAppliedAttribute: (key: string, value: string) => void;
}

export interface MetricHighlight {
	dataPoints: number;
	lastReceived: number;
	totalTimeSeries: number;
	activeTimeSeries: number;
}

export interface MetricAlert {
	alertName: string;
	alertId: string;
}

export interface MetricDashboard {
	dashboardName: string;
	dashboardId: string;
	widgetId: string;
	widgetName: string;
}

export interface MetricMetadata {
	metricType: MetricType;
	description: string;
	unit: string;
	temporality: Temporality;
	isMonotonic: boolean;
}

export interface MetricMetadataState {
	metricType: MetricType;
	description: string;
	temporality: Temporality | undefined;
	unit: string | undefined;
}

export interface MetricAttribute {
	key: string;
	values: string[];
	valueCount: number;
}

export enum TableFields {
	DESCRIPTION = 'description',
	UNIT = 'unit',
	METRIC_TYPE = 'metricType',
	Temporality = 'temporality',
	IS_MONOTONIC = 'isMonotonic',
}
