import { InspectMetricsSeries } from 'api/metricsExplorer/getInspectMetricsDetails';
import { MetricType } from 'api/metricsExplorer/getMetricsList';
import { TagFilter } from 'types/api/queryBuilder/queryBuilderData';
import { AlignedData } from 'uplot';

export type InspectProps = {
	metricName: string | null;
	isOpen: boolean;
	onClose: () => void;
};

export interface UseInspectMetricsReturnData {
	inspectMetricsTimeSeries: InspectMetricsSeries[];
	inspectMetricsStatusCode: number;
	isInspectMetricsLoading: boolean;
	isInspectMetricsError: boolean;
	formattedInspectMetricsTimeSeries: AlignedData;
	spaceAggregationLabels: string[];
	metricInspectionOptions: MetricInspectionOptions;
	dispatchMetricInspectionOptions: (action: MetricInspectionAction) => void;
	inspectionStep: InspectionStep;
	isInspectMetricsRefetching: boolean;
	spaceAggregatedSeriesMap: Map<string, InspectMetricsSeries[]>;
	aggregatedTimeSeries: InspectMetricsSeries[];
}

export interface GraphViewProps {
	inspectMetricsTimeSeries: InspectMetricsSeries[];
	metricUnit: string | undefined;
	metricName: string | null;
	metricType?: MetricType | undefined;
	formattedInspectMetricsTimeSeries: AlignedData;
	resetInspection: () => void;
	spaceAggregationSeriesMap: Map<string, InspectMetricsSeries[]>;
	inspectionStep: InspectionStep;
	setPopoverOptions: (options: GraphPopoverOptions | null) => void;
	popoverOptions: GraphPopoverOptions | null;
	setShowGraphPopover: (showGraphPopover: boolean) => void;
	showGraphPopover: boolean;
}

export interface QueryBuilderProps {
	metricName: string | null;
	setMetricName: (metricName: string) => void;
	metricType: MetricType | undefined;
	spaceAggregationLabels: string[];
	metricInspectionOptions: MetricInspectionOptions;
	dispatchMetricInspectionOptions: (action: MetricInspectionAction) => void;
	inspectionStep: InspectionStep;
}

export interface MetricNameSearchProps {
	metricName: string | null;
	setMetricName: (metricName: string) => void;
}

export interface MetricFiltersProps {
	metricName: string | null;
	metricType: MetricType | undefined;
	metricInspectionOptions: MetricInspectionOptions;
	dispatchMetricInspectionOptions: (action: MetricInspectionAction) => void;
}

export interface MetricTimeAggregationProps {
	metricInspectionOptions: MetricInspectionOptions;
	dispatchMetricInspectionOptions: (action: MetricInspectionAction) => void;
	inspectionStep: InspectionStep;
}

export interface MetricSpaceAggregationProps {
	spaceAggregationLabels: string[];
	metricInspectionOptions: MetricInspectionOptions;
	dispatchMetricInspectionOptions: (action: MetricInspectionAction) => void;
	inspectionStep: InspectionStep;
}

export enum TimeAggregationOptions {
	LATEST = 'latest',
	SUM = 'sum',
	AVG = 'avg',
	MIN = 'min',
	MAX = 'max',
	COUNT = 'count',
}

export enum SpaceAggregationOptions {
	SUM_BY = 'sum_by',
	MIN_BY = 'min_by',
	MAX_BY = 'max_by',
	AVG_BY = 'avg_by',
}

export interface MetricInspectionOptions {
	timeAggregationOption: TimeAggregationOptions | undefined;
	timeAggregationInterval: number | undefined;
	spaceAggregationOption: SpaceAggregationOptions | undefined;
	spaceAggregationLabels: string[];
	filters: TagFilter;
}

export type MetricInspectionAction =
	| { type: 'SET_TIME_AGGREGATION_OPTION'; payload: TimeAggregationOptions }
	| { type: 'SET_TIME_AGGREGATION_INTERVAL'; payload: number }
	| { type: 'SET_SPACE_AGGREGATION_OPTION'; payload: SpaceAggregationOptions }
	| { type: 'SET_SPACE_AGGREGATION_LABELS'; payload: string[] }
	| { type: 'SET_FILTERS'; payload: TagFilter }
	| { type: 'RESET_INSPECTION' };

export enum InspectionStep {
	TIME_AGGREGATION = 1,
	SPACE_AGGREGATION = 2,
	COMPLETED = 3,
}

export interface StepperProps {
	inspectionStep: InspectionStep;
	resetInspection: () => void;
}

export interface GraphPopoverOptions {
	x: number;
	y: number;
	value: number;
	timestamp: number;
	timeSeries: InspectMetricsSeries;
}

export interface GraphPopoverProps {
	spaceAggregationSeriesMap: Map<string, InspectMetricsSeries[]>;
	options: GraphPopoverOptions | null;
	popoverRef: React.RefObject<HTMLDivElement>;
	step: InspectionStep;
	openInExpandedView: () => void;
}

export interface GraphPopoverData {
	timestamp?: number;
	value: string;
	title?: string;
	type: 'instance' | 'aggregated';
	timeSeries?: InspectMetricsSeries;
}

export interface ExpandedViewProps {
	options: GraphPopoverOptions | null;
	spaceAggregationSeriesMap: Map<string, InspectMetricsSeries[]>;
	step: InspectionStep;
}
