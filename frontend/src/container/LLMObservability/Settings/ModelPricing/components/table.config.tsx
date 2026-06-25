import { Badge } from '@signozhq/ui/badge';
import { Button } from '@signozhq/ui/button';
import { ChevronDown } from '@signozhq/icons';
import type { TableColumnDef } from 'components/TanStackTableView';
import { startCase } from 'lodash-es';

import styles from './table.config.module.scss';
import { type LlmpricingruletypesLLMPricingRuleDTO } from 'api/generated/services/sigNoz.schemas';

import {
	formatPricePerMillion,
	getCanonicalId,
	getExtraBuckets,
	getRelativeLastSeen,
	getSourceLabel,
} from '../utils';

interface ColumnsConfig {
	canManage: boolean;
	onEdit: (rule: LlmpricingruletypesLLMPricingRuleDTO) => void;
}

// Column definitions for the model-costs TanStackTable. Sorting is intentionally
// off across the board — the list API only accepts offset/limit, so there's no
// server-side ordering to back a sortable header yet.
export function getModelCostsColumns({
	canManage,
	onEdit,
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
					<div
						className={styles.modelCellName}
						data-testid={`model-cell-name-${row.id}`}
					>
						{row.modelName}
					</div>
					<div
						className={styles.modelCellCanonicalId}
						data-testid={`model-cell-canonical-id-${row.id}`}
					>
						{getCanonicalId(row)}
					</div>
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
				<span
					className={styles.priceCell}
					data-testid={`price-cell-input-${row.id}`}
				>
					{formatPricePerMillion(row.pricing?.input)}
				</span>
			),
		},
		{
			id: 'output',
			header: 'Output / 1M',
			width: { min: 120 },
			enableMove: false,
			cell: ({ row }): JSX.Element => (
				<span
					className={styles.priceCell}
					data-testid={`price-cell-output-${row.id}`}
				>
					{formatPricePerMillion(row.pricing?.output)}
				</span>
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
					return <span className={styles.muted}>—</span>;
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
								<span className={styles.extraBucketsKey}>{startCase(bucket.key)}</span>
								<span className={styles.extraBucketsPrice}>
									{formatPricePerMillion(bucket.pricePerMillion)}
								</span>
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
			width: { fixed: '88px', ignoreLastColumnFill: true },
			pin: 'right',
			enableMove: false,
			enableRemove: false,
			cell: ({ row }): JSX.Element => (
				<Button
					variant="ghost"
					color="secondary"
					size="sm"
					suffix={<ChevronDown size={14} />}
					testId={`edit-rule-${row.id}`}
					onClick={(): void => onEdit(row)}
				>
					{canManage ? 'Edit' : 'View'}
				</Button>
			),
		},
	];
}
