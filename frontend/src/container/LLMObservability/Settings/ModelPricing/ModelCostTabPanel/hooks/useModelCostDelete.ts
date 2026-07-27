import { useCallback, useState } from 'react';
import { toast } from '@signozhq/ui/sonner';
import { useQueryClient } from 'react-query';
import {
	getListLLMPricingRulesQueryKey,
	useDeleteLLMPricingRule,
} from 'api/generated/services/llmpricingrules';

import { TOAST_MODEL_COST_DELETED } from '../../constants';
import type { PricingRule } from '../../types';

// The minimal slice of a rule the delete-confirm flow needs: the id to delete
// and the model name to show in the confirmation copy.
type PendingDelete = Pick<PricingRule, 'id' | 'modelName'>;

interface UseModelCostDeleteResult {
	requestDelete: (rule: PendingDelete) => void;
	confirmDelete: () => Promise<void>;
	cancelDelete: () => void;
	pendingDelete: PendingDelete | null;
	isDeleting: boolean;
}

// Owns the confirm-then-delete flow for a pricing rule, independent of the
// add/edit drawer — delete is triggered from the table row menu, so this state
// lives at the panel level rather than inside useModelCostDrawer.
export function useModelCostDelete(): UseModelCostDeleteResult {
	const queryClient = useQueryClient();
	// The rule queued for deletion. Non-null drives the confirm dialog open.
	const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);

	const { mutateAsync: deleteRuleApi, isLoading: isDeleting } =
		useDeleteLLMPricingRule();

	const requestDelete = useCallback((rule: PendingDelete): void => {
		setPendingDelete({ id: rule.id, modelName: rule.modelName });
	}, []);

	const cancelDelete = useCallback((): void => {
		setPendingDelete(null);
	}, []);

	const confirmDelete = useCallback(async (): Promise<void> => {
		if (!pendingDelete) {
			return;
		}
		try {
			await deleteRuleApi({ pathParams: { id: pendingDelete.id } });
			await queryClient.invalidateQueries({
				queryKey: getListLLMPricingRulesQueryKey(),
			});
			setPendingDelete(null);
			toast.success(TOAST_MODEL_COST_DELETED);
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Delete failed';
			toast.error(message);
		}
	}, [deleteRuleApi, pendingDelete, queryClient]);

	return {
		requestDelete,
		confirmDelete,
		cancelDelete,
		pendingDelete,
		isDeleting,
	};
}
