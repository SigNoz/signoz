import { Badge } from '@signozhq/ui/badge';
import { Typography } from '@signozhq/ui/typography';
import type { TableColumnDef } from 'components/TanStackTableView';
import { startCase } from 'lodash-es';

import styles from './tableConfig.module.scss';
import ModelCostActionsMenu from '../ModelCostActionsMenu';
import { type LlmpricingruletypesLLMPricingRuleDTO } from 'api/generated/services/sigNoz.schemas';

import {
	formatPricePerMillion,
	getCanonicalId,
	getExtraBuckets,
	getRelativeLastSeen,
	getSourceLabel,
} from '../../../../utils';

interface ColumnsConfig {
	canManage: boolean;
	onEdit: (rule: LlmpricingruletypesLLMPricingRuleDTO) => void;
	onDelete: (rule: LlmpricingruletypesLLMPricingRuleDTO) => void;
}

// Column definitions for the model-costs TanStackTable. Sorting is intentionally
// off across the board — the list API only accepts offset/limit, so there's no
// server-side ordering to back a sortable header yet.
export function getModelCostsColumns({
	canManage,
	onEdit,
	onDelete,
}: ColumnsConfig): TableColumnDef<LlmpricingruletypesLLMPricingRuleDTO>[] {
	return [
		{
			id: 'model',
			header: 'Model',
			accessorFn: (row): string => row.modelName ?? '',
			// Flexes to absorb spare width alongside Extra buckets so the row fills
			// the container instead of leaving a gap on the right.
			width: { min: 240, default: '100%' },
			enableMove: false,
			enableRemove: false,
			cell: ({ row }): JSX.Element => (
				<div className={styles.modelCell}>
					<Typography.Text
						weight="semibold"
						truncate={1}
						testId={`model-cell-name-${row.id}`}
					>
						{row.modelName}
					</Typography.Text>

					<Typography.Text truncate={1}>{getCanonicalId(row)}</Typography.Text>
				</div>
			),
		},
		{
			id: 'provider',
			header: 'Provider',
			accessorKey: 'provider',
			width: { min: 140 },
			enableMove: false,
			cell: ({ row }): string => row.provider ?? '',
		},
		{
			id: 'input',
			header: 'Input / 1M',
			width: { min: 120 },
			enableMove: false,
			cell: ({ row }): JSX.Element => (
				<Typography.Text>
					{formatPricePerMillion(row.pricing?.input)}
				</Typography.Text>
			),
		},
		{
			id: 'output',
			header: 'Output / 1M',
			width: { min: 120 },
			enableMove: false,
			cell: ({ row }): JSX.Element => (
				<Typography.Text>
					{formatPricePerMillion(row.pricing?.output)}
				</Typography.Text>
			),
		},
		{
			id: 'extraBuckets',
			header: 'Extra buckets',
			width: { min: 200, default: '100%' },
			enableMove: false,
			cell: ({ row }): JSX.Element => {
				const buckets = getExtraBuckets(row);
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
							<Badge
								key={bucket.key}
								color="vanilla"
								variant="outline"
								className={styles.extraBucketsChip}
							>
								<Typography.Text as="span" size="small">
									{startCase(bucket.key)}
								</Typography.Text>
								<Typography.Text as="span" size="small" weight="semibold">
									{formatPricePerMillion(bucket.pricePerMillion)}
								</Typography.Text>
							</Badge>
						))}
					</div>
				);
			},
		},
		{
			id: 'source',
			header: 'Source',
			width: { min: 130 },
			enableMove: false,
			cell: ({ row }): JSX.Element => (
				<Badge
					color={row.isOverride ? 'amber' : 'robin'}
					variant="outline"
					className={styles.sourceBadge}
					data-testid={`source-badge-${row.id}`}
				>
					{getSourceLabel(row)}
				</Badge>
			),
		},
		{
			id: 'lastSeen',
			header: 'Last seen',
			width: { min: 120 },
			enableMove: false,
			cell: ({ row }): string => getRelativeLastSeen(row),
		},
		{
			id: 'actions',
			header: '',
			width: { fixed: '56px', ignoreLastColumnFill: true },
			pin: 'right',
			enableMove: false,
			enableRemove: false,
			cell: ({ row }): JSX.Element | null => (
				<ModelCostActionsMenu
					rule={row}
					canManage={canManage}
					onEdit={onEdit}
					onDelete={onDelete}
				/>
			),
		},
	];
}
