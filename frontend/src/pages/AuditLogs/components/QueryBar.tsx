import { QueryBuilderV2 } from '@/components/QueryBuilderV2';
import styles from './QueryBar.module.scss';
import { DataSource } from '@/types/common/queryBuilder';
import { initialQueriesMap, PANEL_TYPES } from '@/constants/queryBuilder';
import { useQueryBuilder } from '@/hooks/queryBuilder/useQueryBuilder';
import { useMemo } from 'react';
import { useShareBuilderUrl } from '@/hooks/queryBuilder/useShareBuilderUrl';
import { TelemetrytypesSourceDTO } from '@/api/generated/services/sigNoz.schemas';

export function QueryBar(): JSX.Element {
	const { updateAllQueriesOperators } = useQueryBuilder();

	const defaultValue = useMemo(
		() =>
			updateAllQueriesOperators(
				initialQueriesMap.logs,
				PANEL_TYPES.LIST,
				DataSource.LOGS,
				TelemetrytypesSourceDTO.audit,
			),
		[updateAllQueriesOperators],
	);

	useShareBuilderUrl({ defaultValue });

	return (
		<div className={styles.queryBar}>
			<QueryBuilderV2
				isRawQuery
				config={{
					initialDataSource: DataSource.LOGS,
					queryVariant: 'static',
				}}
				panelType={PANEL_TYPES.LIST}
				showOnlyWhereClause
				version="v3"
			/>
		</div>
	);
}
