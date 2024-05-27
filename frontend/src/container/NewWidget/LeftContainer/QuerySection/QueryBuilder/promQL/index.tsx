import { PlusOutlined } from '@ant-design/icons';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { IPromQLQuery } from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';

import { QueryButton } from '../../styles';
import PromQLQueryBuilder from './query';

function PromQLQueryContainer(): JSX.Element | null {
	const { addNewQueryItem, currentQuery } = useQueryBuilder();

	const addQueryHandler = (): void => {
		addNewQueryItem(EQueryType.PROM);
	};

	return (
		<>
			{currentQuery.promql.map(
				(q: IPromQLQuery, idx: number): JSX.Element => (
					<PromQLQueryBuilder
						key={q.name}
						deletable={currentQuery.promql.length > 1}
						queryIndex={idx}
						queryData={q}
					/>
				),
			)}
			<QueryButton
				onClick={addQueryHandler}
				icon={<PlusOutlined />}
				style={{ margin: '0.4rem 1rem' }}
			>
				Query
			</QueryButton>
		</>
	);
}

export default PromQLQueryContainer;
