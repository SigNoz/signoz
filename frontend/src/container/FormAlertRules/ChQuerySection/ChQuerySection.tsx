import ClickHouseQueryBuilder from 'container/NewWidget/LeftContainer/QuerySection/QueryBuilder/clickHouse/query';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';

function ChQuerySection(): JSX.Element {
	const { currentQuery } = useQueryBuilder();

	return (
		<ClickHouseQueryBuilder
			key="A"
			queryIndex={0}
			queryData={currentQuery.clickhouse_sql[0]}
			deletable={false}
		/>
	);
}

export default ChQuerySection;
