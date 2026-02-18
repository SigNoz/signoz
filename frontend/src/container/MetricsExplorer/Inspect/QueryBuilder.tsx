import { useCallback } from 'react';
import { Button, Card } from 'antd';
import { Atom, Play } from 'lucide-react';

import { QueryBuilderProps } from './types';
import {
	MetricFilters,
	MetricNameSearch,
	MetricSpaceAggregation,
	MetricTimeAggregation,
} from './utils';

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
			type: 'APPLY_INSPECTION_OPTIONS',
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
				<Button
					type="primary"
					className="stage-run-query"
					icon={<Play size={14} />}
					onClick={applyInspectionOptions}
					data-testid="apply-query-button"
				>
					Stage & Run Query
				</Button>
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
