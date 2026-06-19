import { useMemo } from 'react';
import { Pagination } from '@signozhq/ui/pagination';
import { SelectSimple } from '@signozhq/ui/select';
import { useListLLMPricingRules } from 'api/generated/services/llmpricingrules';
import { type ListLLMPricingRulesParams } from 'api/generated/services/sigNoz.schemas';
import { parseAsInteger, useQueryState } from 'nuqs';

import { PAGE_KEY, PAGE_SIZE } from './constants';
import styles from './LLMObservabilityModelPricing.module.scss';
import ModelCostsTable from './ModelCostsTable';
import type { PricingRule } from './types';

// "Model costs" tab: the priced-model listing, its currency control and
// pagination. Page lives in the URL (shareable/reload-safe); replace mode
// keeps paging out of the back-stack, and withDefault(1) omits ?page=1.
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

	const rules: PricingRule[] = useMemo(() => data?.data?.items || [], [data]);
	const total = data?.data?.total ?? 0;

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
			</div>

			{isError && (
				<div className={styles.pageError} role="alert">
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
		</>
	);
}

export default ModelCostsTab;
