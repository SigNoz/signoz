import {
	MetricDetails,
	MetricDetailsAlert,
	MetricDetailsAttribute,
	MetricDetailsDashboard,
} from 'api/metricsExplorer/getMetricDetails';
import { MetricType } from 'api/metricsExplorer/getMetricsList';

export interface MetricDetailsProps {
	onClose: () => void;
	isOpen: boolean;
	metricName: string | null;
	isModalTimeSelection: boolean;
	openInspectModal: (metricName: string) => void;
}

export interface DashboardsAndAlertsPopoverProps {
	dashboards: MetricDetailsDashboard[] | null;
	alerts: MetricDetailsAlert[] | null;
}

export interface MetadataProps {
	metricName: string;
	metadata: MetricDetails['metadata'] | undefined;
	refetchMetricDetails: () => void;
}

export interface AllAttributesProps {
	attributes: MetricDetailsAttribute[];
	metricName: string;
	metricType: MetricType | undefined;
}

export interface AllAttributesValueProps {
	filterKey: string;
	filterValue: string[];
	goToMetricsExploreWithAppliedAttribute: (key: string, value: string) => void;
}
