import { Badge } from '@signozhq/ui/badge';
import { Typography } from '@signozhq/ui/typography';
import type { TableColumnDef } from 'components/TanStackTableView';

import MapToBillingModelSelect from '../../MapToBillingModelSelect';
import styles from './tableConfig.module.scss';
import type { PricingRule, UnpricedModel } from '../../../../types';
import { formatSpanCount } from '../../../../utils';

export interface UnpricedColumnsConfig {
	canManage: boolean;
	// modelName -> selected target rule. Carries the full rule (not just an id)
	// because the per-row dropdown searches server-side and there's no global map.
	selections: Record<string, PricingRule>;
	onSelectRule: (modelName: string, rule: PricingRule) => void;
}

// Column definitions for the unpriced-models TanStackTable. Sorting is off — the
// unmapped-models endpoint returns the full set in one shot with no ordering knob.
// Each row only picks a target billing model here; committing all picks happens
// from the tab's top-level Save button, so there's no per-row action column.
export function getUnpricedModelsColumns({
	canManage,
	selections,
	onSelectRule,
}: UnpricedColumnsConfig): TableColumnDef<UnpricedModel>[] {
	return [
		{
			id: 'model',
			header: 'Model (from spans)',
			accessorFn: (row): string => row.modelName,
			width: { min: 240, default: '100%' },
			enableMove: false,
			enableRemove: false,
			cell: ({ row }): JSX.Element => (
				<Typography.Text
					weight="semibold"
					truncate={1}
					testId={`unpriced-model-name-${row.modelName}`}
				>
					{row.modelName}
				</Typography.Text>
			),
		},
		{
			id: 'provider',
			header: 'Provider',
			width: { min: 140 },
			enableMove: false,
			cell: ({ row }): string => row.provider || 'Unknown',
		},
		{
			id: 'spans',
			header: 'Spans',
			width: { min: 100 },
			enableMove: false,
			cell: ({ row }): JSX.Element => (
				<Badge
					color="cherry"
					variant="outline"
					className={styles.spansBadge}
					data-testid={`unpriced-spans-${row.modelName}`}
				>
					{formatSpanCount(row.spanCount)}
				</Badge>
			),
		},
		{
			id: 'mapTo',
			header: 'Map to billing model',
			width: { min: 280, default: '100%' },
			enableMove: false,
			enableRemove: false,
			cell: ({ row }): JSX.Element => (
				<MapToBillingModelSelect
					modelName={row.modelName}
					selectedRule={selections[row.modelName]}
					disabled={!canManage}
					onSelect={(rule): void => onSelectRule(row.modelName, rule)}
				/>
			),
		},
	];
}
