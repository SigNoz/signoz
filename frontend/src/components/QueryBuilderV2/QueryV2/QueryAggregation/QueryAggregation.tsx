import './QueryAggregation.styles.scss';

import { Tooltip } from 'antd';
import InputWithLabel from 'components/InputWithLabel/InputWithLabel';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { useMemo } from 'react';
import {
	IBuilderQuery,
	IBuilderTraceOperator,
} from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

import QueryAggregationSelect from './QueryAggregationSelect';

function QueryAggregationOptions({
	dataSource,
	panelType,
	onAggregationIntervalChange,
	onChange,
	queryData,
}: {
	dataSource: DataSource;
	panelType?: string;
	onAggregationIntervalChange: (value: number) => void;
	onChange?: (value: string) => void;
	queryData: IBuilderQuery | IBuilderTraceOperator;
}): JSX.Element {
	const showAggregationInterval = useMemo(() => {
		// eslint-disable-next-line sonarjs/prefer-single-boolean-return
		if (panelType === PANEL_TYPES.VALUE) {
			return false;
		}

		if (dataSource === DataSource.TRACES || dataSource === DataSource.LOGS) {
			return !(panelType === PANEL_TYPES.TABLE || panelType === PANEL_TYPES.PIE);
		}

		return true;
	}, [dataSource, panelType]);

	const handleAggregationIntervalChange = (value: string): void => {
		onAggregationIntervalChange(Number(value));
	};

	return (
		<div className="query-aggregation-container">
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

				{showAggregationInterval && (
					<div className="query-aggregation-interval">
						<Tooltip
							title={
								<div>
									Set the time interval for aggregation
									<br />
									<a
										href="https://signoz.io/docs/userguide/query-builder-v5/#time-aggregation-windows"
										target="_blank"
										rel="noopener noreferrer"
										style={{ color: '#1890ff', textDecoration: 'underline' }}
									>
										Learn about step intervals
									</a>
								</div>
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
};

export default QueryAggregationOptions;
