import { useMemo } from 'react';
import { Lock } from '@signozhq/icons';
import { Tooltip } from '@signozhq/ui/tooltip';
import { extractQueryPairs } from 'utils/queryContextUtils';

import styles from './ScopeChip.module.scss';

interface ScopeChipProps {
	expression: string;
}

/**
 * The locked half of the filter. It reads like the editor beside it: the last
 * clause carries the relation, the ones scoping it are counted instead.
 */
export function ScopeChip({ expression }: ScopeChipProps): JSX.Element {
	const clauses = useMemo(() => extractQueryPairs(expression), [expression]);
	const relation = clauses[clauses.length - 1];

	return (
		<Tooltip title={expression} side="top">
			<span className={styles.scopeChip} data-testid="query-search-scope-chip">
				<Lock size={12} className={styles.scopeIcon} />
				<span className={styles.scopeExpression}>
					{relation ? (
						<>
							<span className={styles.scopeKey}>{relation.key}</span>
							<span className={styles.scopeOperator}>{` ${relation.operator} `}</span>
							<span className={styles.scopeValue}>{relation.value}</span>
						</>
					) : (
						expression
					)}
				</span>
				{clauses.length > 1 && (
					<span className={styles.scopeMore}>{`+${clauses.length - 1}`}</span>
				)}
			</span>
		</Tooltip>
	);
}
