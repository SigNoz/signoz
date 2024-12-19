import { PlusOutlined } from '@ant-design/icons';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { EQueryType } from 'types/common/dashboard';

import { QueryButton } from '../../styles';
import ClickHouseQueryBuilder from './query';

function ClickHouseQueryContainer(): JSX.Element | null {
	const { currentQuery, addNewQueryItem } = useQueryBuilder();
	const addQueryHandler = (): void => {
		addNewQueryItem(EQueryType.CLICKHOUSE);
	};

	return (
		<>
			{currentQuery.clickhouse_sql.map((q, idx) => (
				<ClickHouseQueryBuilder
					key={q.name}
					queryIndex={idx}
					deletable={currentQuery.clickhouse_sql.length > 1}
					queryData={q}
				/>
			))}
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

export default ClickHouseQueryContainer;
