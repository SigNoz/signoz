import { useMemo } from 'react';
import { useListLLMPricingRules } from 'api/generated/services/llmpricingrules';
import { type ListLLMPricingRulesParams } from 'api/generated/services/sigNoz.schemas';
import { useTableParams } from 'components/TanStackTableView';

import { LIMIT_KEY, PAGE_KEY, PAGE_SIZE } from './constants';
import styles from './LLMObservabilityModelPricing.module.scss';
import ModelCostsTable from './ModelCostsTable';
import { type LlmpricingruletypesLLMPricingRuleDTO } from 'api/generated/services/sigNoz.schemas';

function ModelCostsTab(): JSX.Element {
	const { page, limit } = useTableParams(
		{ page: PAGE_KEY, limit: LIMIT_KEY },
		{ page: 1, limit: PAGE_SIZE },
	);

	// Search + source filters are intentionally omitted for now — the list API
	// doesn't honour them yet. They'll be reintroduced here once it does.
	const listParams: ListLLMPricingRulesParams = {
		offset: (page - 1) * limit,
		limit,
	};

	const { data, isLoading, isError } = useListLLMPricingRules(listParams);

	const rules: LlmpricingruletypesLLMPricingRuleDTO[] = useMemo(
		() => data?.data?.items || [],
		[data],
	);
	const total = data?.data?.total ?? 0;

	return (
		<>
			{isError && (
				<div className={styles.pageError} role="alert">
					Failed to load pricing rules. Please try again.
				</div>
			)}

			{/* Read-only listing. Edit/Add wiring + the drawer land in the next PR. */}
			<ModelCostsTable
				rules={rules}
				isLoading={isLoading}
				total={total}
				selectedRuleId={null}
				canManage={false}
				onEdit={(): void => undefined}
			/>

			<footer className={styles.pageFooter}>All prices per 1M tokens (USD)</footer>
		</>
	);
}

export default ModelCostsTab;
