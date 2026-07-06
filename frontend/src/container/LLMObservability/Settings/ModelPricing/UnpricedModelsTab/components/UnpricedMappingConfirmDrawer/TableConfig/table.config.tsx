import { Typography } from '@signozhq/ui/typography';
import { startCase } from 'lodash-es';
import type { TableColumnDef } from 'components/TanStackTableView';

import styles from './tableConfig.module.scss';
import type { UnpricedModelMapping } from '../../../hooks/useUnpricedModelMapping';
import {
	formatPricePerMillion,
	getCanonicalId,
	getExtraBuckets,
} from '../../../../utils';

// Columns for the confirm drawer's review table: each pending mapping shown as a
// row (model from spans -> chosen billing model + that rule's pricing). Read-only,
// so there are no actions, sorting, or row interactions. Cells mirror the
// model-costs table so a rule's pricing renders identically in both places.
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
				<Typography.Text
					weight="semibold"
					truncate={1}
					testId={`unpriced-map-confirm-item-${row.model.modelName}`}
				>
					{row.model.modelName}
				</Typography.Text>
			),
		},
		{
			id: 'billingModel',
			header: 'Billing model',
			width: { min: 200, default: '100%' },
			enableMove: false,
			enableRemove: false,
			cell: ({ row }): JSX.Element => (
				<Typography.Text truncate={1}>{getCanonicalId(row.rule)}</Typography.Text>
			),
		},
		{
			id: 'input',
			header: 'Input / 1M',
			width: { min: 110 },
			enableMove: false,
			cell: ({ row }): JSX.Element => (
				<Typography.Text>
					{formatPricePerMillion(row.rule.pricing?.input)}
				</Typography.Text>
			),
		},
		{
			id: 'output',
			header: 'Output / 1M',
			width: { min: 110 },
			enableMove: false,
			cell: ({ row }): JSX.Element => (
				<Typography.Text>
					{formatPricePerMillion(row.rule.pricing?.output)}
				</Typography.Text>
			),
		},
		{
			id: 'extraBuckets',
			header: 'Extra buckets',
			width: { min: 180 },
			enableMove: false,
			cell: ({ row }): JSX.Element => {
				const buckets = getExtraBuckets(row.rule);
				if (buckets.length === 0) {
					return (
						<Typography.Text color="muted" as="span">
							—
						</Typography.Text>
					);
				}
				return (
					<div className={styles.extraBuckets}>
						{buckets.map((bucket) => (
							<div className={styles.extraBucketContainer} key={bucket.key}>
								<Typography.Text as="span" size="small">
									{startCase(bucket.key)}
								</Typography.Text>
								<Typography.Text as="span" size="small" weight="semibold">
									{formatPricePerMillion(bucket.pricePerMillion)}
								</Typography.Text>
							</div>
						))}
					</div>
				);
			},
		},
	];
}
