import ClickHouseQueryBuilder from 'container/NewWidget/LeftContainer/QuerySection/QueryBuilder/clickHouse/query';
import { IClickHouseQueryHandleChange } from 'container/NewWidget/LeftContainer/QuerySection/QueryBuilder/clickHouse/types';
import React from 'react';
import { IChQueries } from 'types/api/alerts/compositeQuery';

function ChQuerySection({
	chQueries,
	setChQueries,
}: ChQuerySectionProps): JSX.Element {
	const handleChQueryChange = ({
		rawQuery,
		legend,
		toggleDelete,
	}: IClickHouseQueryHandleChange): void => {
		let chQuery = chQueries.A;

		if (rawQuery) {
			chQuery.rawQuery = rawQuery;
			chQuery.query = rawQuery;
		}

		if (legend) chQuery.legend = legend;
		if (toggleDelete) {
			chQuery = {
				rawQuery: '',
				legend: '',
				name: 'A',
				disabled: false,
				query: '',
			};
		}
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
			queryData={{ ...chQueries?.A, name: 'A', rawQuery: chQueries?.A.query }}
			handleQueryChange={handleChQueryChange}
		/>
	);
}

interface ChQuerySectionProps {
	chQueries: IChQueries;
	setChQueries: (q: IChQueries) => void;
}

export default ChQuerySection;
