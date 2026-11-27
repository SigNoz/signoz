import { useCallback, useMemo } from 'react';
import { ArrowUp10, Minus } from '@signozhq/icons';
import { Typography } from '@signozhq/ui/typography';
import { TelemetrytypesSourceDTO } from 'api/generated/services/sigNoz.schemas';
import ListViewOrderBy from 'components/OrderBy/ListViewOrderBy';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { DataSource } from 'types/common/queryBuilder';
import { getListOrderBy, setListOrderBy } from 'utils/explorerUtils';

import styles from './OrderBy.module.scss';

const FIELD_KEYS_CONFIG = { source: TelemetrytypesSourceDTO.audit };

export function OrderBy(): JSX.Element {
	const { stagedQuery, currentQuery, redirectWithQueryBuilderData } =
		useQueryBuilder();

	const orderBy = useMemo(() => getListOrderBy(stagedQuery), [stagedQuery]);

	const handleOrderChange = useCallback(
		(value: string): void => {
			redirectWithQueryBuilderData(setListOrderBy(currentQuery, value));
		},
		[currentQuery, redirectWithQueryBuilderData],
	);

	return (
		<div className={styles.orderBy} data-testid="audit-logs-order-by">
			<div className={styles.label}>
				<Typography
					variant="label"
					size="small"
					weight="regular"
					color="inherit"
					as="span"
					textOverflow="wrap"
				>
					Order by
				</Typography>
				<Minus size={14} />
				<ArrowUp10 size={14} />
			</div>
			<div className={styles.select}>
				<ListViewOrderBy
					value={orderBy}
					onChange={handleOrderChange}
					dataSource={DataSource.LOGS}
					fieldKeysConfig={FIELD_KEYS_CONFIG}
				/>
			</div>
		</div>
	);
}
