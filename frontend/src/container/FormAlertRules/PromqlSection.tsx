import PromQLQueryBuilder from 'container/QueryBuilder/rawQueryEditors/PromQL/query';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';

function PromqlSection(): JSX.Element {
	const { currentQuery } = useQueryBuilder();

	return (
		<>
			{currentQuery.promql.map((query, index) => (
				<PromQLQueryBuilder
					key={query.name}
					queryIndex={index}
					queryData={query}
					deletable={false}
				/>
			))}
		</>
	);
}

export default PromqlSection;
