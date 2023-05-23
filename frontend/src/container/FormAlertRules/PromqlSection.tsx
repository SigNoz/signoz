import PromQLQueryBuilder from 'container/NewWidget/LeftContainer/QuerySection/QueryBuilder/promQL/query';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';

function PromqlSection(): JSX.Element {
	const { currentQuery } = useQueryBuilder();

	return (
		<PromQLQueryBuilder
			key="A"
			queryIndex={0}
			queryData={currentQuery.promql[0]}
			deletable={false}
		/>
	);
}

export default PromqlSection;
