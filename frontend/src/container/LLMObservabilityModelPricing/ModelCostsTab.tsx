import { useMemo } from 'react';
import { Button } from '@signozhq/ui/button';
import { Pagination } from '@signozhq/ui/pagination';
import { SelectSimple } from '@signozhq/ui/select';
import { Plus } from '@signozhq/icons';
import { useListLLMPricingRules } from 'api/generated/services/llmpricingrules';
import { type ListLLMPricingRulesParams } from 'api/generated/services/sigNoz.schemas';
import useComponentPermission from 'hooks/useComponentPermission';
import { parseAsInteger, useQueryState } from 'nuqs';
import { useAppContext } from 'providers/App/App';

import { PAGE_KEY, PAGE_SIZE } from './constants';
import styles from './LLMObservabilityModelPricing.module.scss';
import ModelCostDrawer from './ModelCostDrawer';
import ModelCostsTable from './ModelCostsTable';
import { useModelCostDrawer } from './useModelCostDrawer';
import type { PricingRule } from './types';

// "Model costs" tab: the priced-model listing, its currency control,
// pagination, and the add/edit drawer. Page lives in the URL (shareable/
// reload-safe); replace mode keeps paging out of the back-stack, and
// withDefault(1) omits ?page=1.
function ModelCostsTab(): JSX.Element {
	const [page, setPage] = useQueryState(
		PAGE_KEY,
		parseAsInteger.withDefault(1).withOptions({ history: 'replace' }),
	);

	// A crafted/edited URL (?page=0 or negative) parses to a valid integer that
	// skips withDefault(1), so clamp before deriving the offset / display.
	const safePage = Math.max(1, page);

	// Search + source filters are intentionally omitted for now — the list API
	// doesn't honour them yet. They'll be reintroduced here once it does.
	const listParams: ListLLMPricingRulesParams = {
		offset: (safePage - 1) * PAGE_SIZE,
		limit: PAGE_SIZE,
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
				{/* Only USD is priced today — disabled until other currencies land. */}
				<SelectSimple
					className={styles.filtersBarCurrency}
					value="USD"
					disabled
					testId="currency-select"
				/>
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
				selectedRuleId={drawer.selectedRuleId}
				canManage={canManagePricing}
				onEdit={drawer.openForEdit}
			/>

			{total > PAGE_SIZE && (
				<Pagination
					className={styles.pagePagination}
					total={total}
					pageSize={PAGE_SIZE}
					current={safePage}
					onPageChange={setPage}
				/>
			)}

			<footer className={styles.pageFooter}>
				Showing {rules.length} of {total} model{total === 1 ? '' : 's'}
				{' · '}All prices per 1M tokens (USD)
			</footer>
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
