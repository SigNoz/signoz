import { Lock } from '@signozhq/icons';
import { Tooltip } from '@signozhq/ui/tooltip';
import { formatValueForExpression } from 'components/QueryBuilderV2/utils';

import { ScopeClause } from './types';

import styles from './ScopeChip.module.scss';

interface ScopeChipProps {
	/** Scope clauses, broadest first; the last one is shown, the rest counted */
	clauses: ScopeClause[];
	/** The clauses as one expression, shown in full on hover */
	expression: string;
}

/**
 * The locked half of the filter. It reads like the editor beside it: the last
 * clause carries the relation, the ones scoping it are counted instead.
 */
export function ScopeChip({
	clauses,
	expression,
}: ScopeChipProps): JSX.Element | null {
	const relation = clauses[clauses.length - 1];
	if (!relation) {
		return null;
	}

	return (
		<Tooltip title={expression} side="top">
			<span className={styles.scopeChip} data-testid="query-search-scope-chip">
				<Lock size={12} />
				<span className={styles.scopeExpression}>
					<span className={styles.scopeKey}>{relation.key}</span>
					<span className={styles.scopeOperator}> = </span>
					<span className={styles.scopeValue}>
						{formatValueForExpression(relation.value)}
					</span>
				</span>
				{clauses.length > 1 && (
					<span className={styles.scopeMore}>{`+${clauses.length - 1}`}</span>
				)}
			</span>
		</Tooltip>
	);
}
