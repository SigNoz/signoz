import { useEffect, useMemo, useState } from 'react';
import { Input } from '@signozhq/ui/input';
import { Pagination } from '@signozhq/ui/pagination';
import { SelectSimple } from '@signozhq/ui/select';
import { Tabs } from '@signozhq/ui/tabs';
import { Search } from '@signozhq/icons';
import { useListLLMPricingRules } from 'api/generated/services/llmpricingrules';
import useDebounce from 'hooks/useDebounce';

import ModelCostsTable from './ModelCostsTable';
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

	const rules: PricingRule[] = useMemo(() => data?.data?.items || [], [data]);
	const total = data?.data?.total ?? 0;

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
			</div>

			{isError && (
				<div className="page-error" role="alert">
					Failed to load pricing rules. Please try again.
				</div>
			)}

			{/* Read-only listing. Edit/Add wiring + the drawer land in the next PR. */}
			<ModelCostsTable
				rules={rules}
				isLoading={isLoading}
				selectedRuleId={null}
				canManage={false}
				onEdit={(): void => undefined}
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
		</div>
	);
}

export default LLMObservabilityModelPricing;
