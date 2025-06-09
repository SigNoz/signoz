import './QueryAggregation.styles.scss';

import InputWithLabel from 'components/InputWithLabel/InputWithLabel';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { useMemo } from 'react';
import { DataSource } from 'types/common/queryBuilder';

import QueryAggregationSelect from './QueryAggregationSelect';

function QueryAggregationOptions({
	dataSource,
	panelType,
	onAggregationIntervalChange,
}: {
	dataSource: DataSource;
	panelType?: string;
	onAggregationIntervalChange: (value: number) => void;
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
			<QueryAggregationSelect />

			{showAggregationInterval && (
				<div className="query-aggregation-interval">
					<div className="query-aggregation-interval-label">every</div>
					<div className="query-aggregation-interval-input-container">
						<InputWithLabel
							initialValue="60"
							label="Seconds"
							placeholder="60"
							type="number"
							onChange={handleAggregationIntervalChange}
							labelAfter
							onClose={(): void => {}}
						/>
					</div>
				</div>
			)}
		</div>
	);
}

QueryAggregationOptions.defaultProps = {
	panelType: null,
};

export default QueryAggregationOptions;
