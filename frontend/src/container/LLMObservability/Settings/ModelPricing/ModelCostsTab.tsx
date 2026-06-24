import { useMemo } from 'react';
import { Button } from '@signozhq/ui/button';
import { Input } from '@signozhq/ui/input';
import { SelectSimple } from '@signozhq/ui/select';
import { Plus, Search, X } from '@signozhq/icons';
import { useListLLMPricingRules } from 'api/generated/services/llmpricingrules';
import { type ListLLMPricingRulesParams } from 'api/generated/services/sigNoz.schemas';
import { useTableParams } from 'components/TanStackTableView';
import useComponentPermission from 'hooks/useComponentPermission';
import useDebounce from 'hooks/useDebounce';
import { parseAsString, parseAsStringEnum, useQueryState } from 'nuqs';
import { useAppContext } from 'providers/App/App';

import {
	LIMIT_KEY,
	PAGE_KEY,
	PAGE_SIZE,
	SEARCH_DEBOUNCE_MS,
	SEARCH_KEY,
	SOURCE_FILTER_OPTIONS,
	SOURCE_FILTER_TO_IS_OVERRIDE,
	SOURCE_KEY,
	type SourceFilter,
} from './constants';
import styles from './LLMObservabilityModelPricing.module.scss';
import ModelCostDrawer from './ModelCostDrawer';
import ModelCostsTable from './ModelCostsTable';
import { useModelCostDrawer } from './useModelCostDrawer';
import type { PricingRule } from './types';

// "Model costs" tab: the priced-model listing, its currency control, the add/
// edit drawer, and pagination. Page and page size live in the URL (shareable/
// reload-safe) and are owned by TanStackTable via enableQueryParams — this tab
// reads them back through the same useTableParams hook so the two stay in lockstep.
function ModelCostsTab(): JSX.Element {
	const { page, limit, setPage } = useTableParams(
		{ page: PAGE_KEY, limit: LIMIT_KEY },
		{ page: 1, limit: PAGE_SIZE },
	);

	const [search, setSearch] = useQueryState(
		SEARCH_KEY,
		parseAsString.withDefault(''),
	);
	const debouncedSearch = useDebounce(search, SEARCH_DEBOUNCE_MS);

	const [source, setSource] = useQueryState(
		SOURCE_KEY,
		parseAsStringEnum<SourceFilter>(
			SOURCE_FILTER_OPTIONS.map((option) => option.value),
		).withDefault('all'),
	);

	const handleSearchChange = (
		event: React.ChangeEvent<HTMLInputElement>,
	): void => {
		void setSearch(event.target.value || null);
		setPage(1);
	};

	const clearSearch = (): void => {
		void setSearch(null);
		setPage(1);
	};

	const handleSourceChange = (value: string | string[]): void => {
		void setSource(value as SourceFilter);
		setPage(1);
	};

	const isOverride = SOURCE_FILTER_TO_IS_OVERRIDE[source];

	const listParams: ListLLMPricingRulesParams = {
		offset: (page - 1) * limit,
		limit,
		...(debouncedSearch ? { q: debouncedSearch } : {}),
		...(isOverride !== undefined ? { isOverride } : {}),
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
		<>
			<div className={styles.filtersBar}>
				<div className={styles.filtersBarLeft}>
					<Input
						className={styles.filtersBarSearch}
						placeholder="Search by model or provider"
						value={search}
						onChange={handleSearchChange}
						prefix={<Search size={14} />}
						suffix={
							search ? (
								<button
									type="button"
									className={styles.filtersBarSearchClear}
									onClick={clearSearch}
									aria-label="Clear search"
								>
									<X size={14} />
								</button>
							) : undefined
						}
						testId="model-cost-search"
					/>
					<SelectSimple
						className={styles.filtersBarSource}
						items={SOURCE_FILTER_OPTIONS}
						value={source}
						onChange={handleSourceChange}
						testId="source-filter"
					/>
				</div>
				{canManagePricing && (
					<Button
						variant="solid"
						color="primary"
						prefix={<Plus size={14} />}
						onClick={(): void => drawer.openForAdd()}
						testId="add-model-cost-btn"
					>
						Add model cost
					</Button>
				)}
			</div>

			{isError && (
				<div className={styles.pageError} role="alert">
					Failed to load pricing rules. Please try again.
				</div>
			)}

			<ModelCostsTable
				rules={rules}
				isLoading={isLoading}
				total={total}
				selectedRuleId={drawer.selectedRuleId}
				canManage={canManagePricing}
				onEdit={drawer.openForEdit}
			/>

			<footer className={styles.pageFooter}>All prices per 1M tokens (USD)</footer>
			{drawer.isOpen && (
				<ModelCostDrawer
					isOpen={drawer.isOpen}
					mode={drawer.mode}
					initialDraft={drawer.initialDraft}
					onClose={drawer.close}
					onSave={drawer.save}
					onDelete={drawer.deleteRule}
					isSaving={drawer.isSaving}
					isDeleting={drawer.isDeleting}
					saveError={drawer.saveError}
					canManage={canManagePricing}
				/>
			)}
		</>
	);
}

export default ModelCostsTab;
