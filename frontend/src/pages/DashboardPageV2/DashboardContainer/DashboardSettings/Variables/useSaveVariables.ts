import { useCallback, useState } from 'react';
import { toast } from '@signozhq/ui/sonner';
import { useErrorModal } from 'providers/ErrorModalProvider';
import APIError from 'types/api/error';

import { useOptimisticPatch } from '../../hooks/useOptimisticPatch';
import { useDashboardStore } from '../../store/useDashboardStore';
import { formModelToDto } from './variableAdapters';
import type { VariableFormModel } from './variableFormModel';
import { buildVariablesPatch } from './variablePatchOps';

interface UseSaveVariables {
	save: (variables: VariableFormModel[]) => Promise<boolean>;
	isSaving: boolean;
}

export function useSaveVariables(): UseSaveVariables {
	const dashboardId = useDashboardStore((s) => s.dashboardId);
	const { patchAsync } = useOptimisticPatch();
	const { showErrorModal } = useErrorModal();
	const [isSaving, setIsSaving] = useState(false);

	const save = useCallback(
		async (variables: VariableFormModel[]): Promise<boolean> => {
			if (!dashboardId) {
				return false;
			}
			const dtos = variables.map(formModelToDto);
			try {
				setIsSaving(true);
				await patchAsync(buildVariablesPatch(dtos));
				toast.success('Variables updated');
				return true;
			} catch (error) {
				showErrorModal(error as APIError);
				return false;
			} finally {
				setIsSaving(false);
			}
		},
		[dashboardId, patchAsync, showErrorModal],
	);

	return { save, isSaving };
}
