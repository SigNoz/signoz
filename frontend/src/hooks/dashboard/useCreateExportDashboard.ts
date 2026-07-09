import { useCallback } from 'react';
import { useMutation } from 'react-query';
import { createDashboardV2 } from 'api/generated/services/dashboard';
import createDashboardV1 from 'api/v1/dashboards/create';
import { ENTITY_VERSION_V5 } from 'constants/app';
import { useIsDashboardV2 } from 'hooks/useIsDashboardV2';
import { useErrorModal } from 'providers/ErrorModalProvider';
import { Dashboard } from 'types/api/dashboard/getAll';
import APIError from 'types/api/error';

interface UseCreateExportDashboardParams {
	title: string;
	/** Receives the created dashboard (normalized) for the caller to navigate/export. */
	onCreated: (dashboard: Dashboard) => void;
}

interface UseCreateExportDashboardResult {
	create: () => void;
	isLoading: boolean;
}

/**
 * Flag-aware "create a new dashboard to export into". V2 uses the Perses-spec
 * `createDashboardV2`; V1 uses the legacy create. Both normalize to a `Dashboard`.
 */
export function useCreateExportDashboard({
	title,
	onCreated,
}: UseCreateExportDashboardParams): UseCreateExportDashboardResult {
	const isDashboardV2 = useIsDashboardV2();
	const { showErrorModal } = useErrorModal();

	const onError = useCallback(
		(error: unknown): void => showErrorModal(error as APIError),
		[showErrorModal],
	);

	const v1 = useMutation(createDashboardV1, {
		onSuccess: (data) => {
			if (data.data) {
				onCreated(data.data);
			}
		},
		onError,
	});

	const v2 = useMutation(
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
				onCreated({
					id: created.data.id,
					createdAt: '',
					updatedAt: '',
					createdBy: '',
					updatedBy: '',
					locked: false,
					data: { title },
				} as Dashboard);
			},
			onError,
		},
	);

	const create = useCallback((): void => {
		if (isDashboardV2) {
			v2.mutate();
		} else {
			v1.mutate({ title, uploadedGrafana: false, version: ENTITY_VERSION_V5 });
		}
	}, [isDashboardV2, v1, v2, title]);

	return {
		create,
		isLoading: isDashboardV2 ? v2.isLoading : v1.isLoading,
	};
}
