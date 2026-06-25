import { useCallback, useState } from 'react';
import { toast } from '@signozhq/ui/sonner';
import { useQueryClient } from 'react-query';
import {
	getListLLMPricingRulesQueryKey,
	useCreateOrUpdateLLMPricingRules,
	useDeleteLLMPricingRule,
} from 'api/generated/services/llmpricingrules';

import { EMPTY_DRAFT } from '../../../constants';
import type { DrawerDraft, DrawerMode, PricingRule } from '../../../types';
import { buildRulePayload, draftFromRule } from '../../../utils';

interface UseModelCostDrawerResult {
	isOpen: boolean;
	mode: DrawerMode;
	initialDraft: DrawerDraft;
	openForAdd: (prefillModelName?: string) => void;
	openForEdit: (rule: PricingRule) => void;
	close: () => void;
	save: (draft: DrawerDraft) => Promise<void>;
	deleteRule: () => Promise<void>;
	isSaving: boolean;
	isDeleting: boolean;
	saveError: string | null;
	selectedRuleId: string | null;
}

export function useModelCostDrawer(): UseModelCostDrawerResult {
	const queryClient = useQueryClient();
	const [isOpen, setIsOpen] = useState<boolean>(false);
	const [mode, setMode] = useState<DrawerMode>('add');
	const [initialDraft, setInitialDraft] = useState<DrawerDraft>(EMPTY_DRAFT);
	const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
	const [saveError, setSaveError] = useState<string | null>(null);

	const { mutateAsync: createOrUpdate, isLoading: isSaving } =
		useCreateOrUpdateLLMPricingRules();
	const { mutateAsync: deleteRuleApi, isLoading: isDeleting } =
		useDeleteLLMPricingRule();

	const invalidateList = useCallback(async (): Promise<void> => {
		await queryClient.invalidateQueries({
			queryKey: getListLLMPricingRulesQueryKey(),
		});
	}, [queryClient]);

	const openForAdd = useCallback((): void => {
		setMode('add');
		setInitialDraft({
			...EMPTY_DRAFT,
			modelName: '',
			patterns: [],
		});
		setSelectedRuleId(null);
		setSaveError(null);
		setIsOpen(true);
	}, []);

	const openForEdit = useCallback((rule: PricingRule): void => {
		setMode('edit');
		setInitialDraft(draftFromRule(rule));
		setSelectedRuleId(rule.id);
		setSaveError(null);
		setIsOpen(true);
	}, []);

	const close = useCallback((): void => {
		setIsOpen(false);
		setSelectedRuleId(null);
		setSaveError(null);
	}, []);

	const save = useCallback(
		async (draft: DrawerDraft): Promise<void> => {
			setSaveError(null);
			try {
				await createOrUpdate({
					data: { rules: [buildRulePayload(draft)] },
				});
				await invalidateList();
				setIsOpen(false);
				setSelectedRuleId(null);
				toast.success(mode === 'edit' ? 'Model cost updated' : 'Model cost added');
			} catch (error) {
				const message = error instanceof Error ? error.message : 'Save failed';
				setSaveError(message);
			}
		},
		[createOrUpdate, invalidateList, mode],
	);

	const deleteRule = useCallback(async (): Promise<void> => {
		if (!selectedRuleId) {
			return;
		}
		setSaveError(null);
		try {
			await deleteRuleApi({ pathParams: { id: selectedRuleId } });
			await invalidateList();
			setIsOpen(false);
			setSelectedRuleId(null);
			toast.success('Model cost deleted');
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Delete failed';
			setSaveError(message);
		}
	}, [deleteRuleApi, selectedRuleId, invalidateList]);

	return {
		isOpen,
		mode,
		initialDraft,
		openForAdd,
		openForEdit,
		close,
		save,
		deleteRule,
		isSaving,
		isDeleting,
		saveError,
		selectedRuleId,
	};
}
