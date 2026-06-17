import { useEffect, useMemo, useState } from 'react';
import { Button } from '@signozhq/ui/button';
import { Input } from '@signozhq/ui/input';
import { Pagination } from '@signozhq/ui/pagination';
import { SelectSimple } from '@signozhq/ui/select';
import { Tabs } from '@signozhq/ui/tabs';
import { Plus, Search } from '@signozhq/icons';
import { useListLLMPricingRules } from 'api/generated/services/llmpricingrules';
import useComponentPermission from 'hooks/useComponentPermission';
import useDebounce from 'hooks/useDebounce';
import { useAppContext } from 'providers/App/App';

import ModelCostDrawer from './ModelCostDrawer';
import ModelCostsTable from './ModelCostsTable';
import { useModelCostDrawer } from './useModelCostDrawer';
import { useModelPricingFilters } from './useModelPricingFilters';
import type {
	ListModelPricingParams,
	PricingRule,
	SourceFilter,
} from './types';

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

const PAGE_SIZE = 20;

function LLMObservabilityModelPricing(): JSX.Element {
	const { search, source, page, setSearch, setSource, setPage } =
		useModelPricingFilters();
	const [currency, setCurrency] = useState<string>('USD');

	// Controlled locally for instant typing feedback; the URL `q` param (which
	// drives the request) is updated on a debounce so we don't fire a request
	// per keystroke.
	const [searchInput, setSearchInput] = useState<string>(search);
	const debouncedSearch = useDebounce(searchInput, 400);

	useEffect(() => {
		if (debouncedSearch.trim() !== search) {
			setSearch(debouncedSearch);
		}
	}, [debouncedSearch, search, setSearch]);

	const listParams: ListModelPricingParams = {
		offset: (page - 1) * PAGE_SIZE,
		limit: PAGE_SIZE,
		...(search ? { q: search } : {}),
		...(source !== 'all' ? { source } : {}),
	};

	const { data, isLoading, isError } = useListLLMPricingRules(listParams);

	const { user } = useAppContext();
	const [canManagePricing] = useComponentPermission(
		['manage_llm_pricing'],
		user.role,
	);

	const rules: PricingRule[] = useMemo(() => data?.data?.items || [], [data]);
	const total = data?.data?.total ?? 0;

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
				defaultValue="model-costs"
				items={[
					{ key: 'model-costs', label: 'Model costs', children: null },
					{
						key: 'unpriced-models',
						label: 'Unpriced models',
						disabled: true,
						children: null,
					},
				]}
			/>

			<div className="filters-bar">
				<Input
					className="filters-bar__search"
					placeholder="Search by model or provider…"
					prefix={<Search size={14} />}
					value={searchInput}
					onChange={(event): void => setSearchInput(event.target.value)}
					testId="search-input"
				/>
				<SelectSimple
					className="filters-bar__source"
					value={source}
					onChange={(value): void => setSource(value as SourceFilter)}
					items={SOURCE_OPTIONS}
					testId="source-select"
				/>
				<SelectSimple
					className="filters-bar__currency"
					value={currency}
					onChange={(value): void => setCurrency(value as string)}
					items={CURRENCY_OPTIONS}
					testId="currency-select"
				/>
				{canManagePricing && (
					<Button
						variant="solid"
						color="primary"
						className="filters-bar__add"
						prefix={<Plus size={14} />}
						onClick={(): void => drawer.openForAdd()}
						testId="add-model-cost-btn"
					>
						Add model cost
					</Button>
				)}
			</div>

			{isError && (
				<div className="page-error" role="alert">
					Failed to load pricing rules. Please try again.
				</div>
			)}

			<ModelCostsTable
				rules={rules}
				isLoading={isLoading}
				selectedRuleId={drawer.selectedRuleId}
				canManage={canManagePricing}
				onEdit={drawer.openForEdit}
			/>

			{total > PAGE_SIZE && (
				<Pagination
					className="page-pagination"
					total={total}
					pageSize={PAGE_SIZE}
					current={page}
					onPageChange={setPage}
				/>
			)}

			<footer className="page-footer">
				Showing {rules.length} of {total} model{total === 1 ? '' : 's'}
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
				canManage={canManagePricing}
			/>
		</div>
	);
}

export default LLMObservabilityModelPricing;
