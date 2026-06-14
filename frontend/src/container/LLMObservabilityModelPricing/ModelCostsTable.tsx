import { Table, type TableColumnsType } from 'antd';
import { Badge } from '@signozhq/ui/badge';
import { Button } from '@signozhq/ui/button';
import { ChevronDown } from '@signozhq/icons';

import {
	formatPricePerMillion,
	getCanonicalId,
	getExtraBuckets,
	getRelativeLastSeen,
	getSourceLabel,
	type PricingRule,
} from './utils';

interface ModelCostsTableProps {
	rules: PricingRule[];
	isLoading: boolean;
	selectedRuleId: string | null;
	onEdit: (rule: PricingRule) => void;
}

function ModelCostsTable({
	rules,
	isLoading,
	selectedRuleId,
	onEdit,
}: ModelCostsTableProps): JSX.Element {
	const columns: TableColumnsType<PricingRule> = [
		{
			title: 'Model',
			dataIndex: 'modelName',
			key: 'model',
			render: (_value, rule): JSX.Element => (
				<div className="model-cell">
					<div className="model-cell__name">{rule.modelName}</div>
					<div className="model-cell__canonical-id">{getCanonicalId(rule)}</div>
				</div>
			),
		},
		{
			title: 'Provider',
			dataIndex: 'provider',
			key: 'provider',
		},
		{
			title: 'Input / 1M',
			key: 'input',
			render: (_value, rule): JSX.Element => (
				<span className="price-cell">
					{formatPricePerMillion(rule.pricing?.input)}
				</span>
			),
		},
		{
			title: 'Output / 1M',
			key: 'output',
			render: (_value, rule): JSX.Element => (
				<span className="price-cell">
					{formatPricePerMillion(rule.pricing?.output)}
				</span>
			),
		},
		{
			title: 'Extra buckets',
			key: 'extra-buckets',
			render: (_value, rule): JSX.Element => {
				const buckets = getExtraBuckets(rule);
				if (buckets.length === 0) {
					return <span className="muted">—</span>;
				}
				return (
					<div className="extra-buckets">
						{buckets.map((bucket) => (
							<Badge
								key={bucket.key}
								color="vanilla"
								variant="outline"
								className="extra-buckets__chip"
							>
								<span className="extra-buckets__key">{bucket.key}</span>
								<span className="extra-buckets__price">
									{formatPricePerMillion(bucket.pricePerMillion)}
								</span>
							</Badge>
						))}
					</div>
				);
			},
		},
		{
			title: 'Source',
			dataIndex: 'isOverride',
			key: 'source',
			render: (_value, rule): JSX.Element => {
				const label = getSourceLabel(rule);
				return (
					<Badge
						color={rule.isOverride ? 'amber' : 'robin'}
						variant="outline"
						className="source-badge"
						data-testid={`source-badge-${rule.id}`}
					>
						{label}
					</Badge>
				);
			},
		},
		{
			title: 'Last seen',
			key: 'last-seen',
			render: (_value, rule): string => getRelativeLastSeen(rule),
		},
		{
			title: '',
			key: 'actions',
			width: 80,
			render: (_value, rule): JSX.Element => (
				<Button
					variant="ghost"
					color="secondary"
					size="sm"
					suffix={<ChevronDown size={14} />}
					testId={`edit-rule-${rule.id}`}
					onClick={(): void => onEdit(rule)}
				>
					Edit
				</Button>
			),
		},
	];

	return (
		<Table<PricingRule>
			className="model-costs-table"
			rowKey="id"
			columns={columns}
			dataSource={rules}
			loading={isLoading}
			pagination={false}
			rowClassName={(row): string =>
				row.id === selectedRuleId ? 'model-costs-table__row--selected' : ''
			}
			data-testid="model-costs-table"
		/>
	);
}

export default ModelCostsTable;
