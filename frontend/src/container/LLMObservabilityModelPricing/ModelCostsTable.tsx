import { Badge } from '@signozhq/ui/badge';
import { Button } from '@signozhq/ui/button';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@signozhq/ui/table';
import { ChevronDown } from '@signozhq/icons';
import cx from 'classnames';
import { startCase } from 'lodash-es';

import { COLUMN_COUNT } from './constants';
import type { PricingRule } from './types';
import {
	formatPricePerMillion,
	getCanonicalId,
	getExtraBuckets,
	getRelativeLastSeen,
	getSourceLabel,
} from './utils';

interface ModelCostsTableProps {
	rules: PricingRule[];
	isLoading: boolean;
	selectedRuleId: string | null;
	canManage: boolean;
	onEdit: (rule: PricingRule) => void;
}

interface RowProps {
	rule: PricingRule;
	isSelected: boolean;
	canManage: boolean;
	onEdit: (rule: PricingRule) => void;
}

function ModelCostRow({
	rule,
	isSelected,
	canManage,
	onEdit,
}: RowProps): JSX.Element {
	const buckets = getExtraBuckets(rule);

	return (
		<TableRow
			className={cx({ 'model-costs-table__row--selected': isSelected })}
			data-testid={`model-cost-row-${rule.id}`}
		>
			<TableCell>
				<div className="model-cell">
					<div
						className="model-cell__name"
						data-testid={`model-cell-name-${rule.id}`}
					>
						{rule.modelName}
					</div>
					<div
						className="model-cell__canonical-id"
						data-testid={`model-cell-canonical-id-${rule.id}`}
					>
						{getCanonicalId(rule)}
					</div>
				</div>
			</TableCell>
			<TableCell>{rule.provider}</TableCell>
			<TableCell>
				<span className="price-cell" data-testid={`price-cell-input-${rule.id}`}>
					{formatPricePerMillion(rule.pricing?.input)}
				</span>
			</TableCell>
			<TableCell>
				<span className="price-cell" data-testid={`price-cell-output-${rule.id}`}>
					{formatPricePerMillion(rule.pricing?.output)}
				</span>
			</TableCell>
			<TableCell>
				{buckets.length === 0 ? (
					<span className="muted">—</span>
				) : (
					<div className="extra-buckets">
						{buckets.map((bucket) => (
							<Badge
								key={bucket.key}
								color="vanilla"
								variant="outline"
								className="extra-buckets__chip"
							>
								<span className="extra-buckets__key">{startCase(bucket.key)}</span>
								<span className="extra-buckets__price">
									{formatPricePerMillion(bucket.pricePerMillion)}
								</span>
							</Badge>
						))}
					</div>
				)}
			</TableCell>
			<TableCell>
				<Badge
					color={rule.isOverride ? 'amber' : 'robin'}
					variant="outline"
					className="source-badge"
					data-testid={`source-badge-${rule.id}`}
				>
					{getSourceLabel(rule)}
				</Badge>
			</TableCell>
			<TableCell>{getRelativeLastSeen(rule)}</TableCell>
			<TableCell>
				<Button
					variant="ghost"
					color="secondary"
					size="sm"
					suffix={<ChevronDown size={14} />}
					testId={`edit-rule-${rule.id}`}
					onClick={(): void => onEdit(rule)}
				>
					{canManage ? 'Edit' : 'View'}
				</Button>
			</TableCell>
		</TableRow>
	);
}

function ModelCostsTable({
	rules,
	isLoading,
	selectedRuleId,
	canManage,
	onEdit,
}: ModelCostsTableProps): JSX.Element {
	return (
		<Table className="model-costs-table" testId="model-costs-table">
			<TableHeader>
				<TableRow>
					<TableHead>Model</TableHead>
					<TableHead>Provider</TableHead>
					<TableHead>Input / 1M</TableHead>
					<TableHead>Output / 1M</TableHead>
					<TableHead>Extra buckets</TableHead>
					<TableHead>Source</TableHead>
					<TableHead>Last seen</TableHead>
					<TableHead aria-label="Actions" />
				</TableRow>
			</TableHeader>
			<TableBody>
				{isLoading && rules.length === 0 && (
					<TableRow>
						<TableCell colSpan={COLUMN_COUNT} className="model-costs-table__empty">
							Loading pricing rules…
						</TableCell>
					</TableRow>
				)}
				{!isLoading && rules.length === 0 && (
					<TableRow>
						<TableCell colSpan={COLUMN_COUNT} className="model-costs-table__empty">
							No model costs yet.
						</TableCell>
					</TableRow>
				)}
				{rules.map((rule) => (
					<ModelCostRow
						key={rule.id}
						rule={rule}
						isSelected={rule.id === selectedRuleId}
						canManage={canManage}
						onEdit={onEdit}
					/>
				))}
			</TableBody>
		</Table>
	);
}

export default ModelCostsTable;
