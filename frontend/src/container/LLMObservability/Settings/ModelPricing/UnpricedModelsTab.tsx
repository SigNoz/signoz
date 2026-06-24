import { useCallback, useMemo, useState } from 'react';
import { TriangleAlert } from '@signozhq/icons';
import { useListUnmappedLLMModels } from 'api/generated/services/llmpricingrules';
import useComponentPermission from 'hooks/useComponentPermission';
import { useAppContext } from 'providers/App/App';

import styles from './LLMObservabilityModelPricing.module.scss';
import type { PricingRule, UnpricedModel } from './types';
import type { UnpricedColumnsConfig } from './unpricedModels.table.config';
import UnpricedModelsTable from './UnpricedModelsTable';
import { useUnpricedModelMapping } from './useUnpricedModelMapping';

// "Unpriced models" tab: models seen in traces (gen_ai.request.model) that no
// pricing rule matches. Each row can be mapped onto an existing billing model,
// which appends the model name as a match pattern to that rule.
function UnpricedModelsTab(): JSX.Element {
	const { data, isLoading, isError } = useListUnmappedLLMModels();

	const { user } = useAppContext();
	const [canManagePricing] = useComponentPermission(
		['manage_llm_pricing'],
		user.role,
	);

	const models: UnpricedModel[] = useMemo(() => data?.data?.items || [], [data]);

	// modelName -> the rule picked in that row's dropdown. Holds the full rule
	// (the per-row dropdown searches server-side, so there's no global lookup map).
	const [selections, setSelections] = useState<Record<string, PricingRule>>({});
	const [confirmingModel, setConfirmingModel] = useState<string | null>(null);
	const { mapModel, mappingModelName } = useUnpricedModelMapping();

	const onSelectRule = useCallback(
		(modelName: string, rule: PricingRule): void => {
			setSelections((prev) => ({ ...prev, [modelName]: rule }));
		},
		[],
	);

	const onStartConfirm = useCallback((modelName: string): void => {
		setConfirmingModel(modelName);
	}, []);

	const onCancelConfirm = useCallback((): void => {
		setConfirmingModel(null);
	}, []);

	const onConfirm = useCallback(
		async (model: UnpricedModel): Promise<void> => {
			const rule = selections[model.modelName];
			if (!rule) {
				return;
			}
			await mapModel(model, rule);
			setConfirmingModel(null);
		},
		[selections, mapModel],
	);

	const columnsConfig: UnpricedColumnsConfig = {
		canManage: canManagePricing,
		selections,
		confirmingModel,
		mappingModelName,
		onSelectRule,
		onStartConfirm,
		onCancelConfirm,
		onConfirm,
	};

	return (
		<>
			<div className={styles.unpricedBanner}>
				<TriangleAlert size={16} className={styles.unpricedBannerIcon} />
				<span>
					Models detected in traces without pricing. Add costs so{' '}
					<code>gen_ai.estimated_total_cost</code> can be computed.
				</span>
			</div>

			{isError && (
				<div className={styles.pageError} role="alert">
					Failed to load unpriced models. Please try again.
				</div>
			)}

			<UnpricedModelsTable
				models={models}
				isLoading={isLoading}
				columnsConfig={columnsConfig}
			/>
		</>
	);
}

export default UnpricedModelsTab;
