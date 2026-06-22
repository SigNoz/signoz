import { useCallback, useState } from 'react';
import { toast } from '@signozhq/ui/sonner';
import { useQueryClient } from 'react-query';
import {
	getListLLMPricingRulesQueryKey,
	getListUnmappedLLMModelsQueryKey,
	useCreateOrUpdateLLMPricingRules,
} from 'api/generated/services/llmpricingrules';

import type { PricingRule, UnpricedModel } from './types';
import { buildPatternMappingPayload, getCanonicalId } from './utils';

interface UseUnpricedModelMappingResult {
	// Maps an unpriced model onto an existing billing rule (append-as-pattern).
	mapModel: (model: UnpricedModel, rule: PricingRule) => Promise<void>;
	// modelName currently being mapped, so the row can show a per-row spinner.
	mappingModelName: string | null;
}

// Maps unpriced models onto existing pricing rules. There's no dedicated "edit"
// endpoint — mapping reuses CreateOrUpdate (PUT), appending the model name as a
// match pattern on the chosen rule. Both the unmapped list and the rules list are
// invalidated on success so the mapped model drops out of this tab immediately.
export function useUnpricedModelMapping(): UseUnpricedModelMappingResult {
	const queryClient = useQueryClient();
	const [mappingModelName, setMappingModelName] = useState<string | null>(null);

	const { mutateAsync: createOrUpdate } = useCreateOrUpdateLLMPricingRules();

	const mapModel = useCallback(
		async (model: UnpricedModel, rule: PricingRule): Promise<void> => {
			setMappingModelName(model.modelName);
			try {
				await createOrUpdate({
					data: { rules: [buildPatternMappingPayload(rule, model.modelName)] },
				});
				await Promise.all([
					queryClient.invalidateQueries({
						queryKey: getListUnmappedLLMModelsQueryKey(),
					}),
					queryClient.invalidateQueries({
						queryKey: getListLLMPricingRulesQueryKey(),
					}),
				]);
				toast.success(`Mapped ${model.modelName} to ${getCanonicalId(rule)}`);
			} catch (error) {
				const message = error instanceof Error ? error.message : 'Mapping failed';
				toast.error(message);
			} finally {
				setMappingModelName(null);
			}
		},
		[createOrUpdate, queryClient],
	);

	return { mapModel, mappingModelName };
}
