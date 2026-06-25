import { useMemo } from 'react';
import { Button } from '@signozhq/ui/button';
import { Typography } from '@signozhq/ui/typography';
import { Plus } from '@signozhq/icons';
import { useListLLMPricingRules } from 'api/generated/services/llmpricingrules';
import { type ListLLMPricingRulesParams } from 'api/generated/services/sigNoz.schemas';
import { useTableParams } from 'components/TanStackTableView';
import useComponentPermission from 'hooks/useComponentPermission';
import { useAppContext } from 'providers/App/App';

import { LIMIT_KEY, PAGE_KEY, PAGE_SIZE } from '../constants';
import type { PricingRule } from '../types';
import ModelCostDrawer, {
	useModelCostDrawer,
} from './components/ModelCostDrawer';
import ModelCostsTable from './components/ModelCostsTable';
import styles from './ModelCostTabPanel.module.scss';

// "Model costs" tab: the priced-model listing, the add/edit drawer, and
// pagination. Page and page size live in the URL (shareable/reload-safe) and are
// owned by TanStackTable via enableQueryParams — this tab reads them back through
// the same useTableParams hook so the two stay in lockstep.
function ModelCostTabPanel(): JSX.Element {
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

			<footer>
				<Typography.Text color="muted" size="small">
					All prices per 1M tokens (USD)
				</Typography.Text>
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

export default ModelCostTabPanel;
