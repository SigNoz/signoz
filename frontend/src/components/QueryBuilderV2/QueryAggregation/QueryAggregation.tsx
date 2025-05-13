import './QueryAggregation.styles.scss';

// import { Input } from 'antd';
import InputWithLabel from 'components/InputWithLabel/InputWithLabel';

import QueryAggregationSelect from './QueryAggregationSelect';

function QueryAggregationOptions(): JSX.Element {
	return (
		<div className="query-aggregation-container">
			{/* <Input
				placeholder="Search aggregation options..."
				className="query-aggregation-options-input"
			/> */}

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
