import { useCallback, useMemo, useState } from 'react';
import { type SelectSimpleItem } from '@signozhq/ui/select';
import { TriangleAlert } from '@signozhq/icons';
import {
	useListLLMPricingRules,
	useListUnmappedLLMModels,
} from 'api/generated/services/llmpricingrules';
import useComponentPermission from 'hooks/useComponentPermission';
import { useAppContext } from 'providers/App/App';

import { RULE_OPTIONS_LIMIT } from './constants';
import styles from './LLMObservabilityModelPricing.module.scss';
import type { PricingRule, UnpricedModel } from './types';
import type { UnpricedColumnsConfig } from './unpricedModels.table.config';
import UnpricedModelsTable from './UnpricedModelsTable';
import { useUnpricedModelMapping } from './useUnpricedModelMapping';
import { getRuleOptionLabel } from './utils';

// "Unpriced models" tab: models seen in traces (gen_ai.request.model) that no
// pricing rule matches. Each row can be mapped onto an existing billing model,
// which appends the model name as a match pattern to that rule.
function UnpricedModelsTab(): JSX.Element {
	const { data, isLoading, isError } = useListUnmappedLLMModels();
	// All rules feed the per-row "map to" dropdown; deduped with the model-costs
	// tab by react-query so this doesn't double-fetch.
	const { data: rulesData, isLoading: isLoadingRules } = useListLLMPricingRules({
		offset: 0,
		limit: RULE_OPTIONS_LIMIT,
	});

	const { user } = useAppContext();
	const [canManagePricing] = useComponentPermission(
		['manage_llm_pricing'],
		user.role,
	);

	const models: UnpricedModel[] = useMemo(() => data?.data?.items || [], [data]);
	const rules: PricingRule[] = useMemo(
		() => rulesData?.data?.items || [],
		[rulesData],
	);

	const ruleOptions: SelectSimpleItem[] = useMemo(
		() =>
			rules.map((rule) => ({ value: rule.id, label: getRuleOptionLabel(rule) })),
		[rules],
	);
	const rulesById: Record<string, PricingRule> = useMemo(
		() => Object.fromEntries(rules.map((rule) => [rule.id, rule])),
		[rules],
	);

	const [selections, setSelections] = useState<Record<string, string>>({});
	const [confirmingModel, setConfirmingModel] = useState<string | null>(null);
	const { mapModel, mappingModelName } = useUnpricedModelMapping();

	const onSelectRule = useCallback((modelName: string, ruleId: string): void => {
		setSelections((prev) => ({ ...prev, [modelName]: ruleId }));
	}, []);

	const onStartConfirm = useCallback((modelName: string): void => {
		setConfirmingModel(modelName);
	}, []);

	const onCancelConfirm = useCallback((): void => {
		setConfirmingModel(null);
	}, []);

	const onConfirm = useCallback(
		async (model: UnpricedModel): Promise<void> => {
			const rule = rulesById[selections[model.modelName]];
			if (!rule) {
				return;
			}
			await mapModel(model, rule);
			setConfirmingModel(null);
		},
		[rulesById, selections, mapModel],
	);

	const columnsConfig: UnpricedColumnsConfig = {
		canManage: canManagePricing,
		ruleOptions,
		rulesById,
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
				isLoading={isLoading || isLoadingRules}
				columnsConfig={columnsConfig}
			/>
		</>
	);
}

export default UnpricedModelsTab;
