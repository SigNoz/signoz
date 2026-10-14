import { Lock } from '@signozhq/icons';
import { TooltipSimple } from '@signozhq/ui/tooltip';
import { formatValueForExpression } from 'components/QueryBuilderV2/utils';

import { RelatedFilterClause } from '../../Base/relations';

import styles from './EntityOverview.module.scss';

interface ScopeChipProps {
	clauses: RelatedFilterClause[];
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
}: ScopeChipProps): JSX.Element {
	const relation = clauses[clauses.length - 1];

	return (
		<TooltipSimple title={expression} side="top" arrow>
			<span className={styles.scopeChip} data-testid="overview-locked-scope">
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
		</TooltipSimple>
	);
}
