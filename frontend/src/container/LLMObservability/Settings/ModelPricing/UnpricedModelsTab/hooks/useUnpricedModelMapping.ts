import { useCallback, useState } from 'react';
import { toast } from '@signozhq/ui/sonner';
import { useQueryClient } from 'react-query';
import {
	getListLLMPricingRulesQueryKey,
	getListUnmappedLLMModelsQueryKey,
	useCreateOrUpdateLLMPricingRules,
} from 'api/generated/services/llmpricingrules';

import type {
	PricingRule,
	UnpricedModel,
} from 'container/LLMObservability/Settings/ModelPricing/types';
import { buildPatternMappingPayload } from 'container/LLMObservability/Settings/ModelPricing/utils';

// A single row's choice: map this unpriced model onto this billing rule.
export interface UnpricedModelMapping {
	model: UnpricedModel;
	rule: PricingRule;
}

interface UseUnpricedModelMappingResult {
	// Commits a single mapping in one request. Resolves true on success so the
	// caller can close the confirm dialog and clear its staged pick.
	mapModel: (mapping: UnpricedModelMapping) => Promise<boolean>;
	// True while the save is in flight, so the confirm button can spin.
	isSaving: boolean;
}

// Maps an unpriced model onto an existing pricing rule. There's no dedicated
// "edit" endpoint — mapping reuses CreateOrUpdate (PUT), appending the model name
// as a match pattern on the chosen rule so the model inherits its pricing. Both
// the unmapped list and the rules list are invalidated on success so the mapped
// model drops out of this tab immediately.
export function useUnpricedModelMapping(): UseUnpricedModelMappingResult {
	const queryClient = useQueryClient();
	const [isSaving, setIsSaving] = useState(false);

	const { mutateAsync: createOrUpdate } = useCreateOrUpdateLLMPricingRules();

	const mapModel = useCallback(
		async ({ model, rule }: UnpricedModelMapping): Promise<boolean> => {
			const payload = buildPatternMappingPayload(rule, model.modelName);

			setIsSaving(true);
			try {
				await createOrUpdate({ data: { rules: [payload] } });
				await Promise.all([
					queryClient.invalidateQueries({
						queryKey: getListUnmappedLLMModelsQueryKey(),
					}),
					queryClient.invalidateQueries({
						queryKey: getListLLMPricingRulesQueryKey(),
					}),
				]);
				toast.success('Mapped model');
				return true;
			} catch (error) {
				const message = error instanceof Error ? error.message : 'Mapping failed';
				toast.error(message);
				return false;
			} finally {
				setIsSaving(false);
			}
		},
		[createOrUpdate, queryClient],
	);

	return { mapModel, isSaving };
}
