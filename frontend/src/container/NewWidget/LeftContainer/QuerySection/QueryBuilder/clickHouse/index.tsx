import { PlusOutlined } from '@ant-design/icons';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { Info } from 'lucide-react';
import { EQueryType } from 'types/common/dashboard';
import DOCLINKS from 'utils/docLinks';

import { QueryButton } from '../../styles';
import ClickHouseQueryBuilder from './query';

function ClickHouseQueryContainer(): JSX.Element | null {
	const { currentQuery, addNewQueryItem } = useQueryBuilder();
	const addQueryHandler = (): void => {
		addNewQueryItem(EQueryType.CLICKHOUSE);
	};

	return (
		<>
			<div
				style={{
					display: 'flex',
					alignItems: 'flex-start',
					gap: 8,
					margin: '8px 8px 16px 16px',
					padding: '8px 12px',
					borderRadius: 4,
					background: 'var(--callout-primary-background)',
					border: '1px solid var(--callout-primary-border)',
					color: 'var(--callout-primary-description)',
				}}
			>
				<Info
					size={14}
					style={{
						marginTop: 2,
						flexShrink: 0,
						color: 'var(--callout-primary-icon)',
					}}
				/>
				<span>
					<a
						href={DOCLINKS.QUERY_CLICKHOUSE_TRACES}
						target="_blank"
						rel="noreferrer"
						style={{ color: 'var(--bg-robin-400)', textDecoration: 'underline' }}
					>
						Learn how to write optimized queries
					</a>
					{' · '}
					If you are using LLMs,{' '}
					<a
						href="https://signoz.io/docs/ai/agent-skills/#installation"
						target="_blank"
						rel="noreferrer"
						style={{ color: 'var(--bg-robin-400)', textDecoration: 'underline' }}
					>
						install SigNoz clickhouse-query agent skill
					</a>{' '}
					to write optimized queries
				</span>
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
