import './QueryAggregation.styles.scss';

import InputWithLabel from 'components/InputWithLabel/InputWithLabel';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { useMemo } from 'react';
import { DataSource } from 'types/common/queryBuilder';

import QueryAggregationSelect from './QueryAggregationSelect';

function QueryAggregationOptions({
	dataSource,
	panelType,
}: {
	dataSource: DataSource;
	panelType?: string;
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
