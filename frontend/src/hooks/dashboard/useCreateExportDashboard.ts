import { useCallback } from 'react';
import { useMutation } from 'react-query';
import { createDashboardV2 } from 'api/generated/services/dashboard';
import { useErrorModal } from 'providers/ErrorModalProvider';
import APIError from 'types/api/error';

import type { ExportDashboard } from './useExportDashboards';

interface UseCreateExportDashboardParams {
	title: string;
	onCreated: (dashboard: ExportDashboard) => void;
}

interface UseCreateExportDashboardResult {
	create: () => void;
	isLoading: boolean;
}

/**
 * "Create a new dashboard to export into". Uses the Perses-spec `createDashboardV2`
 * and normalizes to an `ExportDashboard`.
 */
export function useCreateExportDashboard({
	title,
	onCreated,
}: UseCreateExportDashboardParams): UseCreateExportDashboardResult {
	const { showErrorModal } = useErrorModal();

	const onError = useCallback(
		(error: unknown): void => showErrorModal(error as APIError),
		[showErrorModal],
	);

	const createDashboardMutation = useMutation(
		() =>
			createDashboardV2({
				schemaVersion: 'v6',
				generateName: true,
				tags: null,
				spec: {
					display: { name: title },
					layouts: [],
					panels: {},
					variables: [],
				},
			}),
		{
			onSuccess: (created) => {
				onCreated({ id: created.data.id, title });
			},
			onError,
		},
	);

	const create = useCallback((): void => {
		createDashboardMutation.mutate();
	}, [createDashboardMutation]);

	return {
		create,
		isLoading: createDashboardMutation.isLoading,
	};
}
