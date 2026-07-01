import { startCase } from 'lodash-es';
import type { TableColumnDef } from 'components/TanStackTableView';

import styles from './UnpricedMappingConfirmDrawer.module.scss';
import type { UnpricedModelMapping } from './useUnpricedModelMapping';
import {
	formatPricePerMillion,
	getCanonicalId,
	getExtraBuckets,
} from './utils';

// Columns for the confirm drawer's review table: each pending mapping shown as a
// row (model from spans -> chosen billing model + that rule's pricing). Read-only,
// so there are no actions, sorting, or row interactions.
export function getUnpricedMappingColumns(): TableColumnDef<UnpricedModelMapping>[] {
	return [
		{
			id: 'model',
			header: 'Model (from spans)',
			accessorFn: (row): string => row.model.modelName,
			width: { min: 220, default: '100%' },
			enableMove: false,
			enableRemove: false,
			cell: ({ row }): JSX.Element => (
				<div
					className={styles.modelCell}
					data-testid={`unpriced-map-confirm-item-${row.model.modelName}`}
				>
					{row.model.modelName}
				</div>
			),
		},
		{
			id: 'billingModel',
			header: 'Billing model',
			width: { min: 200, default: '100%' },
			enableMove: false,
			enableRemove: false,
			cell: ({ row }): JSX.Element => (
				<span className={styles.billingCell}>{getCanonicalId(row.rule)}</span>
			),
		},
		{
			id: 'input',
			header: 'Input / 1M',
			width: { min: 110 },
			enableMove: false,
			cell: ({ row }): JSX.Element => (
				<span className={styles.priceCell}>
					{formatPricePerMillion(row.rule.pricing?.input)}
				</span>
			),
		},
		{
			id: 'output',
			header: 'Output / 1M',
			width: { min: 110 },
			enableMove: false,
			cell: ({ row }): JSX.Element => (
				<span className={styles.priceCell}>
					{formatPricePerMillion(row.rule.pricing?.output)}
				</span>
			),
		},
		{
			id: 'cache',
			header: 'Cache',
			width: { min: 180 },
			enableMove: false,
			cell: ({ row }): JSX.Element => {
				const buckets = getExtraBuckets(row.rule);
				if (buckets.length === 0) {
					return <span className={styles.muted}>—</span>;
				}
				return (
					<div className={styles.cacheBuckets}>
						{buckets.map((bucket) => (
							<span key={bucket.key} className={styles.cacheBucket}>
								{startCase(bucket.key)} {formatPricePerMillion(bucket.pricePerMillion)}
							</span>
						))}
					</div>
				);
			},
		},
	];
}
