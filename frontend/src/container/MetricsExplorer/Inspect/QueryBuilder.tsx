import { Button, Card } from 'antd';
import { Atom } from 'lucide-react';

import { QueryBuilderProps } from './types';
import {
	MetricFilters,
	MetricNameSearch,
	MetricSpaceAggregation,
	MetricTimeAggregation,
} from './utils';

function QueryBuilder({
	metricName,
	setMetricName,
	spaceAggregationLabels,
	metricInspectionOptions,
	dispatchMetricInspectionOptions,
	metricType,
}: QueryBuilderProps): JSX.Element {
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
			</div>
			<Card className="inspect-metrics-query-builder-content">
				<MetricNameSearch metricName={metricName} setMetricName={setMetricName} />
				<MetricFilters
					metricName={metricName}
					metricType={metricType}
					metricInspectionOptions={metricInspectionOptions}
					dispatchMetricInspectionOptions={dispatchMetricInspectionOptions}
				/>
				<MetricTimeAggregation
					metricInspectionOptions={metricInspectionOptions}
					dispatchMetricInspectionOptions={dispatchMetricInspectionOptions}
				/>
				<MetricSpaceAggregation
					spaceAggregationLabels={spaceAggregationLabels}
					metricInspectionOptions={metricInspectionOptions}
					dispatchMetricInspectionOptions={dispatchMetricInspectionOptions}
				/>
			</Card>
		</div>
	);
}

export default QueryBuilder;
