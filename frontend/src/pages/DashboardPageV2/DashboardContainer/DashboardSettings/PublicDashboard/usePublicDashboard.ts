import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from 'react-query';
import { useCopyToClipboard } from 'react-use';
import { toast } from '@signozhq/ui/sonner';
import {
	invalidateGetPublicDashboard,
	useCreatePublicDashboard,
	useDeletePublicDashboard,
	useUpdatePublicDashboard,
} from 'api/generated/services/dashboard';
import { DEFAULT_TIME_RANGE } from 'container/TopNav/DateTimeSelectionV2/constants';
import { useAppContext } from 'providers/App/App';
import { useErrorModal } from 'providers/ErrorModalProvider';
import APIError from 'types/api/error';
import { USER_ROLES } from 'types/roles';
import { getAbsoluteUrl } from 'utils/basePath';
import { openInNewTab } from 'utils/navigation';

import { usePublicDashboardMeta } from './usePublicDashboardMeta';

export interface UsePublicDashboardReturn {
	isPublic: boolean;
	isAdmin: boolean;
	isLoading: boolean;
	isPublishing: boolean;
	isUpdating: boolean;
	isUnpublishing: boolean;
	timeRangeEnabled: boolean;
	defaultTimeRange: string;
	publicUrl: string;
	setTimeRangeEnabled: (value: boolean) => void;
	setDefaultTimeRange: (value: string) => void;
	onPublish: () => void;
	onUpdate: () => void;
	onUnpublish: () => void;
	onCopyUrl: () => void;
	onOpenUrl: () => void;
}

/**
 * Encapsulates the public-dashboard query, the create/update/delete mutations and the
 * local form state for the V2 publish settings section. Targets the same
 * `/dashboards/{id}/public` endpoint as V1 via the generated client.
 */
export function usePublicDashboard(
	dashboardId: string,
): UsePublicDashboardReturn {
	const queryClient = useQueryClient();
	const { showErrorModal } = useErrorModal();
	const { user } = useAppContext();
	const isAdmin = user?.role === USER_ROLES.ADMIN;
	const [, copyToClipboard] = useCopyToClipboard();

	const [timeRangeEnabled, setTimeRangeEnabled] = useState<boolean>(true);
	const [defaultTimeRange, setDefaultTimeRange] =
		useState<string>(DEFAULT_TIME_RANGE);

	// Read the shared public-meta cache — the GET is owned globally (toolbar), so the
	// drawer reuses it rather than issuing its own request.
	const {
		publicMeta,
		isPublic,
		isLoading: isLoadingMeta,
		isFetching,
		error,
		refetch,
	} = usePublicDashboardMeta(dashboardId);

	// Seed form state from the server config when published.
	useEffect(() => {
		if (publicMeta) {
			setTimeRangeEnabled(publicMeta.timeRangeEnabled ?? false);
			setDefaultTimeRange(publicMeta.defaultTimeRange || DEFAULT_TIME_RANGE);
		}
	}, [publicMeta]);

	// A 404 (dashboard not published) surfaces as an error — reset to defaults.
	useEffect(() => {
		if (error) {
			setTimeRangeEnabled(true);
			setDefaultTimeRange(DEFAULT_TIME_RANGE);
		}
	}, [error]);

	const publicUrl = useMemo(
		() => getAbsoluteUrl(publicMeta?.publicPath ?? ''),
		[publicMeta?.publicPath],
	);

	const handleError = useCallback(
		(err: unknown): void => {
			showErrorModal(err as APIError);
		},
		[showErrorModal],
	);

	const handleSuccess = useCallback(
		(message: string): void => {
			toast.success(message);
			void invalidateGetPublicDashboard(queryClient, { id: dashboardId });
			refetch();
		},
		[queryClient, dashboardId, refetch],
	);

	const { mutate: createPublicDashboard, isLoading: isPublishing } =
		useCreatePublicDashboard({
			mutation: {
				onSuccess: () => handleSuccess('Dashboard published successfully'),
				onError: handleError,
			},
		});

	const { mutate: updatePublicDashboard, isLoading: isUpdating } =
		useUpdatePublicDashboard({
			mutation: {
				onSuccess: () => handleSuccess('Public dashboard updated successfully'),
				onError: handleError,
			},
		});

	const { mutate: deletePublicDashboard, isLoading: isUnpublishing } =
		useDeletePublicDashboard({
			mutation: {
				onSuccess: () => handleSuccess('Dashboard unpublished successfully'),
				onError: handleError,
			},
		});

	const onPublish = useCallback((): void => {
		if (!dashboardId) {
			return;
		}
		createPublicDashboard({
			pathParams: { id: dashboardId },
			data: { timeRangeEnabled, defaultTimeRange },
		});
	}, [createPublicDashboard, dashboardId, timeRangeEnabled, defaultTimeRange]);

	const onUpdate = useCallback((): void => {
		if (!dashboardId) {
			return;
		}
		updatePublicDashboard({
			pathParams: { id: dashboardId },
			data: { timeRangeEnabled, defaultTimeRange },
		});
	}, [updatePublicDashboard, dashboardId, timeRangeEnabled, defaultTimeRange]);

	const onUnpublish = useCallback((): void => {
		if (!dashboardId) {
			return;
		}
		deletePublicDashboard({ pathParams: { id: dashboardId } });
	}, [deletePublicDashboard, dashboardId]);

	const onCopyUrl = useCallback((): void => {
		if (!publicUrl) {
			return;
		}
		copyToClipboard(publicUrl);
		toast.success('Copied public dashboard URL successfully');
	}, [copyToClipboard, publicUrl]);

	const onOpenUrl = useCallback((): void => {
		if (publicUrl) {
			openInNewTab(publicUrl);
		}
	}, [publicUrl]);

	const isLoading =
		isLoadingMeta || isFetching || isPublishing || isUpdating || isUnpublishing;

	return {
		isPublic,
		isAdmin,
		isLoading,
		isPublishing,
		isUpdating,
		isUnpublishing,
		timeRangeEnabled,
		defaultTimeRange,
		publicUrl,
		setTimeRangeEnabled,
		setDefaultTimeRange,
		onPublish,
		onUpdate,
		onUnpublish,
		onCopyUrl,
		onOpenUrl,
	};
}
