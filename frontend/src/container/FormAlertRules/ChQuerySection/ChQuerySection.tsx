import ClickHouseQueryBuilder from 'container/NewWidget/LeftContainer/QuerySection/QueryBuilder/clickHouse/query';
import { IClickHouseQueryHandleChange } from 'container/NewWidget/LeftContainer/QuerySection/QueryBuilder/clickHouse/types';
import React from 'react';
import { IChQueries } from 'types/api/alerts/compositeQuery';

import { rawQueryToIChQuery, toIClickHouseQuery } from './transform';

function ChQuerySection({
	chQueries,
	setChQueries,
}: ChQuerySectionProps): JSX.Element {
	const handleChQueryChange = ({
		rawQuery,
		legend,
		toggleDelete,
	}: IClickHouseQueryHandleChange): void => {
		const chQuery = rawQueryToIChQuery(
			chQueries.A,
			rawQuery,
			legend,
			toggleDelete,
		);

		setChQueries({
			A: {
				...chQuery,
			},
		});
	};

	return (
		<ClickHouseQueryBuilder
			key="A"
			queryIndex="A"
			queryData={toIClickHouseQuery(chQueries?.A)}
			handleQueryChange={handleChQueryChange}
		/>
	);
}

interface ChQuerySectionProps {
	chQueries: IChQueries;
	setChQueries: (q: IChQueries) => void;
}

export default ChQuerySection;
