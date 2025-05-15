import './QueryAggregation.styles.scss';

import InputWithLabel from 'components/InputWithLabel/InputWithLabel';
import { DataSource } from 'types/common/queryBuilder';

import QueryAggregationSelect from './QueryAggregationSelect';

function QueryAggregationOptions({
	source,
}: {
	source: DataSource;
}): JSX.Element {
	console.log('source', source);

	return (
		<div className="query-aggregation-container">
			<QueryAggregationSelect />

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
		</div>
	);
}

export default QueryAggregationOptions;
