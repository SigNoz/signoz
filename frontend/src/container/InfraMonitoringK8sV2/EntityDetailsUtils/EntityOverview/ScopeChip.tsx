import { Fragment } from 'react';
import { Lock } from '@signozhq/icons';
import { formatValueForExpression } from 'components/QueryBuilderV2/utils';

import { RelatedFilterClause } from '../../Base/relations';

import styles from './EntityOverview.module.scss';

interface ScopeChipProps {
	clauses: RelatedFilterClause[];
}

/**
 * The locked half of the filter. It reads like the editor beside it.
 */
export function ScopeChip({ clauses }: ScopeChipProps): JSX.Element {
	return (
		<span className={styles.scopeChip} data-testid="overview-locked-scope">
			<Lock size={12} className={styles.scopeLock} />
			<span className={styles.scopeExpression}>
				{clauses.map((clause, index) => (
					<Fragment key={clause.key}>
						{index > 0 && <span className={styles.scopeOperator}> AND </span>}
						<span className={styles.scopeKey}>{clause.key}</span>
						<span className={styles.scopeOperator}> = </span>
						<span className={styles.scopeValue}>
							{formatValueForExpression(clause.value)}
						</span>
					</Fragment>
				))}
			</span>
		</span>
	);
}
