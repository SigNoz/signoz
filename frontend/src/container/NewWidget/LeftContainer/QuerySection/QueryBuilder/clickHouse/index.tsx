import { PlusOutlined } from '@ant-design/icons';
import { Callout } from '@signozhq/ui';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { EQueryType } from 'types/common/dashboard';
import DOCLINKS from 'utils/docLinks';

import { QueryButton } from '../../styles';
import ClickHouseQueryBuilder from './query';

import './ClickHouse.styles.scss';

function ClickHouseQueryContainer(): JSX.Element | null {
	const { currentQuery, addNewQueryItem } = useQueryBuilder();
	const addQueryHandler = (): void => {
		addNewQueryItem(EQueryType.CLICKHOUSE);
	};

	return (
		<>
			<div className="info-banner-wrapper">
				<Callout
					type="info"
					showIcon
					title={
						<span>
							<a
								href={DOCLINKS.QUERY_CLICKHOUSE_TRACES}
								target="_blank"
								rel="noreferrer"
							>
								Learn to write faster, optimized queries
							</a>
							{' · Using AI? '}
							<a href={DOCLINKS.AGENT_SKILL_INSTALL} target="_blank" rel="noreferrer">
								Install the SigNoz ClickHouse query agent skill
							</a>
						</span>
					}
				/>
			</div>

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
