import { useMemo, useState } from 'react';
import { Button, Input, Select, Tabs } from 'antd';
import { Plus, Search } from '@signozhq/icons';
import { useListLLMPricingRules } from 'api/generated/services/llmpricingrules';

import ModelCostDrawer from './ModelCostDrawer';
import ModelCostsTable from './ModelCostsTable';
import { useModelCostDrawer } from './useModelCostDrawer';
import { filterRules, type PricingRule, type SourceFilter } from './utils';

import './LLMObservabilityModelPricing.styles.scss';

const SOURCE_OPTIONS: { value: SourceFilter; label: string }[] = [
	{ value: 'all', label: 'Source: All' },
	{ value: 'auto', label: 'Auto-populated' },
	{ value: 'override', label: 'User override' },
];

const CURRENCY_OPTIONS = [
	{ value: 'USD', label: 'USD' },
	{ value: 'EUR', label: 'EUR', disabled: true },
	{ value: 'INR', label: 'INR', disabled: true },
];

const PAGE_SIZE = 100;

function LLMObservabilityModelPricing(): JSX.Element {
	const [search, setSearch] = useState<string>('');
	const [source, setSource] = useState<SourceFilter>('all');
	const [currency, setCurrency] = useState<string>('USD');

	const { data, isLoading, isError } = useListLLMPricingRules({
		offset: 0,
		limit: PAGE_SIZE,
	});

	const rules: PricingRule[] = useMemo(() => data?.data?.items || [], [data]);

	const filteredRules = useMemo(
		() => filterRules(rules, search, source),
		[rules, search, source],
	);

	const drawer = useModelCostDrawer();

	return (
		<div
			className="llm-observability-model-pricing"
			data-testid="llm-observability-model-pricing-page"
		>
			<header className="page-header">
				<div className="page-header__title">
					<h1>Configuration</h1>
					<p>Model pricing and cost estimation settings</p>
				</div>
			</header>

			<Tabs
				className="page-tabs"
				defaultActiveKey="model-costs"
				items={[
					{ key: 'model-costs', label: 'Model costs' },
					{
						key: 'unpriced-models',
						label: 'Unpriced models',
						disabled: true,
					},
				]}
			/>

			<div className="filters-bar">
				<Input
					className="filters-bar__search"
					placeholder="Search by model or provider…"
					prefix={<Search size={14} />}
					value={search}
					onChange={(event): void => setSearch(event.target.value)}
					data-testid="search-input"
					allowClear
				/>
				<Select<SourceFilter>
					className="filters-bar__source"
					value={source}
					onChange={(value): void => setSource(value)}
					options={SOURCE_OPTIONS}
					data-testid="source-select"
				/>
				<Select<string>
					className="filters-bar__currency"
					value={currency}
					onChange={(value): void => setCurrency(value)}
					options={CURRENCY_OPTIONS}
					data-testid="currency-select"
				/>
				<Button
					type="primary"
					className="filters-bar__add"
					icon={<Plus size={14} />}
					onClick={(): void => drawer.openForAdd()}
					data-testid="add-model-cost-btn"
				>
					Add model cost
				</Button>
			</div>

			{isError && (
				<div className="page-error" role="alert">
					Failed to load pricing rules. Please try again.
				</div>
			)}

			<ModelCostsTable
				rules={filteredRules}
				isLoading={isLoading}
				selectedRuleId={drawer.selectedRuleId}
				onEdit={drawer.openForEdit}
			/>

			<footer className="page-footer">
				Showing {filteredRules.length} model{filteredRules.length === 1 ? '' : 's'}
				{' · '}All prices per 1M tokens (USD)
			</footer>

			<ModelCostDrawer
				isOpen={drawer.isOpen}
				mode={drawer.mode}
				draft={drawer.draft}
				setDraft={drawer.setDraft}
				onClose={drawer.close}
				onSave={drawer.save}
				onDelete={drawer.deleteRule}
				isSaving={drawer.isSaving}
				isDeleting={drawer.isDeleting}
				saveError={drawer.saveError}
			/>
		</div>
	);
}

export default LLMObservabilityModelPricing;
