import { useCallback } from 'react';
import { Button, Card } from 'antd';
import RunQueryBtn from 'container/QueryBuilder/components/RunQueryBtn/RunQueryBtn';
import { Atom } from 'lucide-react';

import MetricFilters from './MetricFilters';
import MetricNameSearch from './MetricNameSearch';
import MetricSpaceAggregation from './MetricSpaceAggregation';
import MetricTimeAggregation from './MetricTimeAggregation';
import { QueryBuilderProps } from './types';

function QueryBuilder({
	currentMetricName,
	setCurrentMetricName,
	setAppliedMetricName,
	spaceAggregationLabels,
	currentMetricInspectionOptions,
	dispatchMetricInspectionOptions,
	inspectionStep,
	inspectMetricsTimeSeries,
	currentQuery,
	setCurrentQuery,
}: QueryBuilderProps): JSX.Element {
	const applyInspectionOptions = useCallback(() => {
		setAppliedMetricName(currentMetricName ?? '');
		dispatchMetricInspectionOptions({
			type: 'APPLY_METRIC_INSPECTION_OPTIONS',
		});
	}, [currentMetricName, setAppliedMetricName, dispatchMetricInspectionOptions]);

	return (
		<div className="inspect-metrics-query-builder">
			<div className="inspect-metrics-query-builder-header">
				<Button
					className="query-builder-button-label"
					size="middle"
					icon={<Atom size={14} />}
					disabled
				>
					Query Builder
				</Button>
				<RunQueryBtn onStageRunQuery={applyInspectionOptions} />
			</div>
			<Card className="inspect-metrics-query-builder-content">
				<MetricNameSearch
					currentMetricName={currentMetricName}
					setCurrentMetricName={setCurrentMetricName}
				/>
				<MetricFilters
					dispatchMetricInspectionOptions={dispatchMetricInspectionOptions}
					currentQuery={currentQuery}
					setCurrentQuery={setCurrentQuery}
				/>
				<MetricTimeAggregation
					inspectionStep={inspectionStep}
					currentMetricInspectionOptions={currentMetricInspectionOptions}
					dispatchMetricInspectionOptions={dispatchMetricInspectionOptions}
					inspectMetricsTimeSeries={inspectMetricsTimeSeries}
				/>
				<MetricSpaceAggregation
					inspectionStep={inspectionStep}
					spaceAggregationLabels={spaceAggregationLabels}
					currentMetricInspectionOptions={currentMetricInspectionOptions}
					dispatchMetricInspectionOptions={dispatchMetricInspectionOptions}
				/>
			</Card>
		</div>
	);
}

export default QueryBuilder;
