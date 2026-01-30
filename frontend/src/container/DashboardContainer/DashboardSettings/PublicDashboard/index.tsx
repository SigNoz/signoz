/* eslint-disable import/no-extraneous-dependencies */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation } from 'react-query';
import { useCopyToClipboard } from 'react-use';
import { Checkbox } from '@signozhq/checkbox';
import { toast } from '@signozhq/sonner';
import { Button, Select, Typography } from 'antd';
import createPublicDashboardAPI from 'api/dashboard/public/createPublicDashboard';
import revokePublicDashboardAccessAPI from 'api/dashboard/public/revokePublicDashboardAccess';
import updatePublicDashboardAPI from 'api/dashboard/public/updatePublicDashboard';
import { useGetPublicDashboardMeta } from 'hooks/dashboard/useGetPublicDashboardMeta';
import { useGetTenantLicense } from 'hooks/useGetTenantLicense';
import { Copy, ExternalLink, Globe, Info, Loader2, Trash } from 'lucide-react';
import { useAppContext } from 'providers/App/App';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import { PublicDashboardMetaProps } from 'types/api/dashboard/public/getMeta';
import APIError from 'types/api/error';
import { USER_ROLES } from 'types/roles';

import './PublicDashboard.styles.scss';

export const TIME_RANGE_PRESETS_OPTIONS = [
	{
		label: 'Last 5 minutes',
		value: '5m',
	},
	{
		label: 'Last 15 minutes',
		value: '15m',
	},
	{
		label: 'Last 30 minutes',
		value: '30m',
	},
	{
		label: 'Last 1 hour',
		value: '1h',
	},
	{
		label: 'Last 6 hours',
		value: '6h',
	},
	{
		label: 'Last 1 day',
		value: '24h',
	},
];

const showErrorNotification = (error: APIError): void => {
	toast.error(error.getErrorCode(), {
		description: error.getErrorMessage(),
	});
};

function PublicDashboardSetting(): JSX.Element {
	const [publicDashboardData, setPublicDashboardData] = useState<
		PublicDashboardMetaProps | undefined
	>(undefined);
	const [timeRangeEnabled, setTimeRangeEnabled] = useState(true);
	const [defaultTimeRange, setDefaultTimeRange] = useState('30m');
	const [, setCopyPublicDashboardURL] = useCopyToClipboard();

	const { selectedDashboard } = useDashboard();

	const { isCloudUser, isEnterpriseSelfHostedUser } = useGetTenantLicense();

	const isPublicDashboardEnabled = isCloudUser || isEnterpriseSelfHostedUser;

	const { user } = useAppContext();

	const isAdmin = user?.role === USER_ROLES.ADMIN;

	const handleDefaultTimeRange = useCallback((value: string): void => {
		setDefaultTimeRange(value);
	}, []);

	const handleTimeRangeEnabled = useCallback((): void => {
		setTimeRangeEnabled((prev) => !prev);
	}, []);

	const {
		data: publicDashboardResponse,
		isLoading: isLoadingPublicDashboard,
		isFetching: isFetchingPublicDashboard,
		refetch: refetchPublicDashboard,
		error: errorPublicDashboard,
	} = useGetPublicDashboardMeta(
		selectedDashboard?.id || '',
		!!selectedDashboard?.id && isPublicDashboardEnabled,
	);

	const isPublicDashboard = !!publicDashboardData?.publicPath;

	useEffect(() => {
		if (publicDashboardResponse?.data) {
			setPublicDashboardData(publicDashboardResponse?.data);
		}

		if (errorPublicDashboard) {
			console.error('Error getting public dashboard', errorPublicDashboard);
			setPublicDashboardData(undefined);
			setTimeRangeEnabled(true);
			setDefaultTimeRange('30m');
		}
	}, [publicDashboardResponse, errorPublicDashboard]);

	useEffect(() => {
		if (publicDashboardResponse?.data) {
			setTimeRangeEnabled(
				publicDashboardResponse?.data?.timeRangeEnabled || false,
			);
			setDefaultTimeRange(
				publicDashboardResponse?.data?.defaultTimeRange || '30m',
			);
		}
	}, [publicDashboardResponse]);

	const {
		mutate: createPublicDashboard,
		isLoading: isLoadingCreatePublicDashboard,
		data: createPublicDashboardResponse,
	} = useMutation(createPublicDashboardAPI, {
		onSuccess: () => {
			toast.success('Public dashboard created successfully');
		},
		onError: (error: APIError) => {
			showErrorNotification(error);
		},
	});

	const {
		mutate: updatePublicDashboard,
		isLoading: isLoadingUpdatePublicDashboard,
		data: updatePublicDashboardResponse,
	} = useMutation(updatePublicDashboardAPI, {
		onSuccess: () => {
			toast.success('Public dashboard updated successfully');
		},
		onError: (error: APIError) => {
			showErrorNotification(error);
		},
	});

	const {
		mutate: revokePublicDashboardAccess,
		isLoading: isLoadingRevokePublicDashboardAccess,
		data: revokePublicDashboardAccessResponse,
	} = useMutation(revokePublicDashboardAccessAPI, {
		onSuccess: () => {
			toast.success('Dashboard unpublished successfully');
		},
		onError: (error: APIError) => {
			showErrorNotification(error);
		},
	});

	const handleCreatePublicDashboard = (): void => {
		if (!selectedDashboard) {
			return;
		}

		createPublicDashboard({
			dashboardId: selectedDashboard.id,
			timeRangeEnabled,
			defaultTimeRange,
		});
	};

	const handleUpdatePublicDashboard = (): void => {
		if (!selectedDashboard) {
			return;
		}

		updatePublicDashboard({
			dashboardId: selectedDashboard.id,
			timeRangeEnabled,
			defaultTimeRange,
		});
	};

	const handleRevokePublicDashboardAccess = (): void => {
		if (!selectedDashboard) {
			return;
		}

		revokePublicDashboardAccess({
			id: selectedDashboard.id,
		});
	};

	useEffect(() => {
		if (
			(createPublicDashboardResponse &&
				createPublicDashboardResponse.httpStatusCode === 201) ||
			(updatePublicDashboardResponse &&
				updatePublicDashboardResponse.httpStatusCode === 204) ||
			(revokePublicDashboardAccessResponse &&
				revokePublicDashboardAccessResponse.httpStatusCode === 204)
		) {
			refetchPublicDashboard();
		}
	}, [
		createPublicDashboardResponse,
		updatePublicDashboardResponse,
		revokePublicDashboardAccessResponse,
		refetchPublicDashboard,
	]);

	const handleCopyPublicDashboardURL = (): void => {
		if (!publicDashboardResponse?.data?.publicPath) {
			return;
		}

		try {
			setCopyPublicDashboardURL(
				`${window.location.origin}${publicDashboardResponse?.data?.publicPath}`,
			);
			toast.success('Copied Public Dashboard URL successfully');
		} catch (error) {
			console.error('Error copying public dashboard URL', error);
		}
	};

	const publicDashboardURL = useMemo(
		() => `${window.location.origin}${publicDashboardResponse?.data?.publicPath}`,
		[publicDashboardResponse],
	);

	const isLoading =
		isLoadingCreatePublicDashboard ||
		isLoadingUpdatePublicDashboard ||
		isLoadingRevokePublicDashboardAccess ||
		isLoadingPublicDashboard;

	return (
		<div className="public-dashboard-setting-container">
			<div className="public-dashboard-setting-content">
				<Typography.Title
					level={5}
					className="public-dashboard-setting-content-title"
				>
					{isPublicDashboard
						? 'This dashboard is publicly accessible. Anyone with the link can view it.'
						: 'This dashboard is private. Publish it to make it accessible to anyone with the link.'}
				</Typography.Title>

				<div className="timerange-enabled-checkbox">
					<Checkbox
						id="enable-time-range"
						checked={timeRangeEnabled}
						onCheckedChange={handleTimeRangeEnabled}
						labelName="Enable time range"
					/>
				</div>

				<div className="default-time-range-select">
					<div className="default-time-range-select-label">
						<Typography.Text className="default-time-range-select-label-text">
							Default time range
						</Typography.Text>
					</div>
					<Select
						placeholder="Select default time range"
						options={TIME_RANGE_PRESETS_OPTIONS}
						value={defaultTimeRange}
						onChange={handleDefaultTimeRange}
						data-testid="default-time-range-select-dropdown"
						className="default-time-range-select-dropdown"
					/>
				</div>

				{isPublicDashboard && (
					<div className="public-dashboard-url">
						<div className="url-label-container">
							<Typography.Text className="url-label">
								Public Dashboard URL
							</Typography.Text>
						</div>

						<div className="url-container">
							<Typography.Text className="url-text">
								{publicDashboardURL}
							</Typography.Text>

							<Button
								type="link"
								className="url-copy-btn periscope-btn ghost"
								icon={<Copy size={12} />}
								onClick={handleCopyPublicDashboardURL}
							/>
							<Button
								type="link"
								className="periscope-btn ghost"
								icon={<ExternalLink size={12} />}
								onClick={(): void => {
									if (publicDashboardURL) {
										window.open(publicDashboardURL, '_blank');
									}
								}}
							/>
						</div>
					</div>
				)}

				<div className="public-dashboard-setting-callout">
					<Typography.Text className="public-dashboard-setting-callout-text">
						<Info size={12} className="public-dashboard-setting-callout-icon" />{' '}
						Dashboard variables won&apos;t work in public dashboards
					</Typography.Text>
				</div>

				<div className="public-dashboard-setting-actions">
					{!isPublicDashboard ? (
						<Button
							type="primary"
							className="create-public-dashboard-btn periscope-btn primary"
							disabled={isLoading || !isAdmin}
							onClick={handleCreatePublicDashboard}
							loading={
								isLoadingCreatePublicDashboard ||
								isFetchingPublicDashboard ||
								isLoadingPublicDashboard
							}
							icon={
								isLoadingCreatePublicDashboard ||
								isFetchingPublicDashboard ||
								isLoadingPublicDashboard ? (
									<Loader2 className="animate-spin" size={14} />
								) : (
									<Globe size={14} />
								)
							}
						>
							Publish dashboard
						</Button>
					) : (
						<>
							<Button
								type="default"
								className="periscope-btn secondary"
								disabled={isLoading || !isAdmin}
								onClick={handleRevokePublicDashboardAccess}
								loading={isLoadingRevokePublicDashboardAccess}
								icon={<Trash size={14} />}
							>
								Unpublish dashboard
							</Button>

							<Button
								type="primary"
								className="create-public-dashboard-btn periscope-btn primary"
								disabled={isLoading || !isAdmin}
								onClick={handleUpdatePublicDashboard}
								loading={isLoadingUpdatePublicDashboard}
								icon={<Globe size={14} />}
							>
								Update published dashboard
							</Button>
						</>
					)}
				</div>
			</div>
		</div>
	);
}

export default PublicDashboardSetting;
