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
					<Typography
						variant="paragraph"
						size="base"
						weight="regular"
						color="main"
						as="p"
						textOverflow="ellipsis"
						testId={`model-cell-name-${row.id}`}
					>
						{row.modelName}
					</Typography>

					<Typography
						variant="paragraph"
						size="base"
						weight="regular"
						color="inherit"
						as="p"
						textOverflow="ellipsis"
					>
						{getCanonicalId(row)}
					</Typography>
				</div>
			),
		},
		{
			id: 'provider',
			header: 'Provider',
			accessorKey: 'provider',
			width: { min: 140 },
			enableMove: false,
			cell: ({ row }): JSX.Element => (
				<Typography
					variant="paragraph"
					size="base"
					weight="regular"
					color="main"
					as="span"
					textOverflow="wrap"
				>
					{row.provider ?? ''}
				</Typography>
			),
		},
		{
			id: 'input',
			header: 'Input / 1M',
			width: { min: 120 },
			enableMove: false,
			cell: ({ row }): JSX.Element => (
				<Typography
					variant="paragraph"
					size="base"
					weight="regular"
					color="main"
					as="span"
					textOverflow="wrap"
				>
					{formatPricePerMillion(row.pricing?.input)}
				</Typography>
			),
		},
		{
			id: 'output',
			header: 'Output / 1M',
			width: { min: 120 },
			enableMove: false,
			cell: ({ row }): JSX.Element => (
				<Typography
					variant="paragraph"
					size="base"
					weight="regular"
					color="main"
					as="span"
					textOverflow="wrap"
				>
					{formatPricePerMillion(row.pricing?.output)}
				</Typography>
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
						<Typography
							variant="paragraph"
							size="base"
							weight="regular"
							color="main"
							as="span"
							textOverflow="wrap"
						>
							—
						</Typography>
					);
				}
				return (
					<div className={styles.extraBuckets}>
						{buckets.map((bucket) => (
							<Badge
								textTransform="none"
								key={bucket.key}
								color="secondary"
								variant="outlined"
							>
								<Typography
									variant="paragraph"
									size="small"
									weight="regular"
									color="main"
									as="span"
									textOverflow="wrap"
								>
									{startCase(bucket.key)}
								</Typography>{' '}
								<Typography
									variant="paragraph"
									size="small"
									weight="bold"
									color="main"
									as="span"
									textOverflow="wrap"
								>
									{formatPricePerMillion(bucket.pricePerMillion)}
								</Typography>
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
					textTransform="none"
					color={row.isOverride ? 'warning' : 'primary'}
					variant="outlined"
					testId={`source-badge-${row.id}`}
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
			cell: ({ row }): JSX.Element => (
				<Typography
					variant="paragraph"
					size="base"
					weight="regular"
					color="main"
					as="span"
					textOverflow="wrap"
				>
					{getRelativeLastSeen(row)}
				</Typography>
			),
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
