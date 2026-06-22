import { Badge } from '@signozhq/ui/badge';
import { SelectSimple, type SelectSimpleItem } from '@signozhq/ui/select';
import type { TableColumnDef } from 'components/TanStackTableView';

import styles from './LLMObservabilityModelPricing.module.scss';
import type { PricingRule, UnpricedModel } from './types';
import UnpricedModelActionCell from './UnpricedModelActionCell';
import { formatSpanCount } from './utils';

export interface UnpricedColumnsConfig {
	canManage: boolean;
	ruleOptions: SelectSimpleItem[];
	rulesById: Record<string, PricingRule>;
	// modelName -> selected target rule id.
	selections: Record<string, string>;
	// modelName whose action cell is showing the inline confirm panel, if any.
	confirmingModel: string | null;
	// modelName currently being committed, so its confirm button shows a spinner.
	mappingModelName: string | null;
	onSelectRule: (modelName: string, ruleId: string) => void;
	onStartConfirm: (modelName: string) => void;
	onCancelConfirm: () => void;
	onConfirm: (model: UnpricedModel) => void;
}

// Column definitions for the unpriced-models TanStackTable. Sorting is off — the
// unmapped-models endpoint returns the full set in one shot with no ordering knob.
export function getUnpricedModelsColumns({
	canManage,
	ruleOptions,
	rulesById,
	selections,
	confirmingModel,
	mappingModelName,
	onSelectRule,
	onStartConfirm,
	onCancelConfirm,
	onConfirm,
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
				<div
					className={styles.modelCellName}
					data-testid={`unpriced-model-name-${row.modelName}`}
				>
					{row.modelName}
				</div>
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
			width: { min: 280 },
			enableMove: false,
			cell: ({ row }): JSX.Element => (
				<SelectSimple
					className={styles.mapToSelect}
					items={ruleOptions}
					value={selections[row.modelName] ?? ''}
					placeholder="Select a billing model"
					disabled={!canManage || ruleOptions.length === 0}
					onChange={(value): void => onSelectRule(row.modelName, value as string)}
					testId={`map-to-select-${row.modelName}`}
				/>
			),
		},
		{
			id: 'action',
			header: 'Action',
			width: { min: 200, default: '100%' },
			enableMove: false,
			enableRemove: false,
			cell: ({ row }): JSX.Element | null => (
				<UnpricedModelActionCell
					model={row}
					targetRule={rulesById[selections[row.modelName]]}
					isConfirming={confirmingModel === row.modelName}
					isMapping={mappingModelName === row.modelName}
					canManage={canManage}
					onStartConfirm={onStartConfirm}
					onCancelConfirm={onCancelConfirm}
					onConfirm={onConfirm}
				/>
			),
		},
	];
}
