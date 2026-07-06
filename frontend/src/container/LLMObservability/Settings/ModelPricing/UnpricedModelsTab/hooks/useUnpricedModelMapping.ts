import { useCallback, useState } from 'react';
import { toast } from '@signozhq/ui/sonner';
import { useQueryClient } from 'react-query';
import {
	getListLLMPricingRulesQueryKey,
	getListUnmappedLLMModelsQueryKey,
	useCreateOrUpdateLLMPricingRules,
} from 'api/generated/services/llmpricingrules';

import type { PricingRule, UnpricedModel } from '../../types';
import { buildPatternMappingPayload } from '../../utils';

// A single row's choice: map this unpriced model onto this billing rule.
export interface UnpricedModelMapping {
	model: UnpricedModel;
	rule: PricingRule;
}

interface UseUnpricedModelMappingResult {
	// Commits all selected mappings in one request. Resolves true on success so
	// the caller can close the confirm dialog and clear its selections.
	mapModels: (mappings: UnpricedModelMapping[]) => Promise<boolean>;
	// True while the batch save is in flight, so the confirm button can spin.
	isSaving: boolean;
}

// Maps unpriced models onto existing pricing rules. There's no dedicated "edit"
// endpoint — mapping reuses CreateOrUpdate (PUT), appending each model name as a
// match pattern on the chosen rule. Mappings that target the same rule are merged
// into a single payload so their patterns don't overwrite one another, and every
// payload goes out in one request. Both the unmapped list and the rules list are
// invalidated on success so mapped models drop out of this tab immediately.
export function useUnpricedModelMapping(): UseUnpricedModelMappingResult {
	const queryClient = useQueryClient();
	const [isSaving, setIsSaving] = useState(false);

	const { mutateAsync: createOrUpdate } = useCreateOrUpdateLLMPricingRules();

	const mapModels = useCallback(
		async (mappings: UnpricedModelMapping[]): Promise<boolean> => {
			if (mappings.length === 0) {
				return false;
			}

			// Group model names by their target rule so each rule is PUT once with
			// all of its newly mapped patterns appended together.
			const groups = new Map<
				string,
				{ rule: PricingRule; modelNames: string[] }
			>();
			mappings.forEach(({ model, rule }) => {
				const group = groups.get(rule.id);
				if (group) {
					group.modelNames.push(model.modelName);
				} else {
					groups.set(rule.id, { rule, modelNames: [model.modelName] });
				}
			});

			const rules = Array.from(groups.values()).map(({ rule, modelNames }) =>
				buildPatternMappingPayload(rule, modelNames),
			);

			setIsSaving(true);
			try {
				await createOrUpdate({ data: { rules } });
				await Promise.all([
					queryClient.invalidateQueries({
						queryKey: getListUnmappedLLMModelsQueryKey(),
					}),
					queryClient.invalidateQueries({
						queryKey: getListLLMPricingRulesQueryKey(),
					}),
				]);
				toast.success(
					`Mapped ${mappings.length} model${mappings.length === 1 ? '' : 's'}`,
				);
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

	return { mapModels, isSaving };
}
