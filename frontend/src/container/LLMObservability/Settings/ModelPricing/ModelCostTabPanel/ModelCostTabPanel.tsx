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
} from '../constants';
import type { PricingRule } from '../types';
import DeleteConfirmDialog from './components/DeleteConfirmDialog';
import ModelCostDrawer, {
	useModelCostDrawer,
} from './components/ModelCostDrawer';
import ModelCostsTable from './components/ModelCostsTable';
import { useModelCostDelete } from './hooks/useModelCostDelete';
import styles from './ModelCostTabPanel.module.scss';

// "Model costs" tab: the priced-model listing, search + source filter, the add/
// edit drawer, and pagination. Page and page size live in the URL (shareable/
// reload-safe) and are owned by TanStackTable via enableQueryParams — this tab
// reads them back through the same useTableParams hook so the two stay in lockstep.
function ModelCostTabPanel(): JSX.Element {
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

	const { data, isLoading, isError } = useListLLMPricingRules(listParams, {
		query: {
			enabled: search === debouncedSearch,
		},
	});

	const { user } = useAppContext();
	const [canManagePricing] = useComponentPermission(
		['manage_llm_pricing'],
		user.role,
	);

	const rules: PricingRule[] = useMemo(() => data?.data?.items || [], [data]);
	const total = data?.data?.total ?? 0;

	const drawer = useModelCostDrawer();
	const deletion = useModelCostDelete();

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
								<Button
									variant="ghost"
									color="secondary"
									size="icon"
									prefix={<X size={14} />}
									onClick={clearSearch}
									aria-label="Clear search"
									testId="model-cost-search-clear"
								/>
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
				onDelete={deletion.requestDelete}
			/>

			{drawer.isOpen && (
				<ModelCostDrawer
					isOpen={drawer.isOpen}
					mode={drawer.mode}
					initialDraft={drawer.initialDraft}
					onClose={drawer.close}
					onSave={drawer.save}
					isSaving={drawer.isSaving}
					saveError={drawer.saveError}
					canManage={canManagePricing}
				/>
			)}

			{deletion.pendingDelete && (
				<DeleteConfirmDialog
					open
					modelName={deletion.pendingDelete.modelName}
					isDeleting={deletion.isDeleting}
					onConfirm={deletion.confirmDelete}
					onCancel={deletion.cancelDelete}
				/>
			)}
		</>
	);
}

export default ModelCostTabPanel;
