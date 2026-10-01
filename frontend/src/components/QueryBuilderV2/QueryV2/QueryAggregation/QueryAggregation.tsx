import { useMemo } from 'react';
import { Tooltip } from 'antd';
import InputWithLabel from 'components/InputWithLabel/InputWithLabel';
import { PANEL_TYPES } from 'constants/queryBuilder';
import {
	IBuilderQuery,
	IBuilderTraceOperator,
} from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

import {
	QueryBuilderField,
	QueryBuilderFieldsConfig,
} from '../../queryBuilderFields.types';
import { resolveQueryBuilderField } from '../../queryBuilderFields.utils';

import QueryAggregationSelect from './QueryAggregationSelect';

import './QueryAggregation.styles.scss';

function QueryAggregationOptions({
	dataSource,
	panelType,
	onAggregationIntervalChange,
	onChange,
	queryData,
	fieldsConfig,
}: {
	dataSource: DataSource;
	panelType?: string;
	onAggregationIntervalChange: (value: number) => void;
	onChange?: (value: string) => void;
	queryData: IBuilderQuery | IBuilderTraceOperator;
	fieldsConfig?: QueryBuilderFieldsConfig;
}): JSX.Element {
	const stepInterval = useMemo(() => {
		if (panelType === PANEL_TYPES.VALUE) {
			return { hidden: true, disabled: false, reason: undefined };
		}

		const isNonMetricSource =
			dataSource === DataSource.TRACES || dataSource === DataSource.LOGS;

		if (
			isNonMetricSource &&
			(panelType === PANEL_TYPES.TABLE || panelType === PANEL_TYPES.PIE)
		) {
			return { hidden: true, disabled: false, reason: undefined };
		}

		return resolveQueryBuilderField(QueryBuilderField.StepInterval, fieldsConfig);
	}, [dataSource, panelType, fieldsConfig]);

	const handleAggregationIntervalChange = (value: string): void => {
		onAggregationIntervalChange(Number(value));
	};

	return (
		<div
			className="query-aggregation-container"
			data-testid="query-aggregation-container"
		>
			<div className="aggregation-container">
				<QueryAggregationSelect
					onChange={onChange}
					queryData={queryData}
					maxAggregations={
						panelType === PANEL_TYPES.VALUE || panelType === PANEL_TYPES.PIE
							? 1
							: undefined
					}
				/>

				{!stepInterval.hidden && (
					<div className="query-aggregation-interval">
						<Tooltip
							title={
								stepInterval.reason ?? (
									<div>
										Set the time interval for aggregation
										<br />
										<a
											href="https://signoz.io/docs/userguide/query-builder-v5/#temporal-aggregation-within-each-time-series"
											target="_blank"
											rel="noopener noreferrer"
											style={{ color: '#1890ff', textDecoration: 'underline' }}
										>
											Learn about step intervals
										</a>
									</div>
								)
							}
							placement="top"
						>
							<div
								className="metrics-aggregation-section-content-item-label"
								style={{ cursor: 'help' }}
							>
								every
							</div>
						</Tooltip>

						<div className="query-aggregation-interval-input-container">
							<InputWithLabel
								initialValue={queryData?.stepInterval ? queryData?.stepInterval : null}
								className="query-aggregation-interval-input"
								label="Seconds"
								placeholder="Auto"
								type="number"
								onChange={handleAggregationIntervalChange}
								disabled={stepInterval.disabled}
								labelAfter
							/>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

QueryAggregationOptions.defaultProps = {
	panelType: null,
	onChange: undefined,
	fieldsConfig: undefined,
};

export default QueryAggregationOptions;
