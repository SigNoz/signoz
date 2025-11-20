/* eslint-disable import/no-extraneous-dependencies */
import './PublicDashboard.styles.scss';

import { Checkbox } from '@signozhq/checkbox';
import { toast } from '@signozhq/sonner';
import { Button, Select, Typography } from 'antd';
import createPublicDashboardAPI from 'api/dashboard/public/createPublicDashboard';
import revokePublicDashboardAccessAPI from 'api/dashboard/public/revokePublicDashboardAccess';
import updatePublicDashboardAPI from 'api/dashboard/public/updatePublicDashboard';
import { useGetPublicDashboard } from 'hooks/dashboard/useGetPublicDashboard';
import { ExternalLink, Globe, Share, Trash } from 'lucide-react';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation } from 'react-query';
import { useCopyToClipboard } from 'react-use';
import { PublicDashboardProps } from 'types/api/dashboard/public/get';

const TIME_RANGE_PRESETS_OPTIONS = [
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
		label: 'Last 2 hours',
		value: '2h',
	},
	{
		label: 'Last 4 hours',
		value: '4h',
	},
	{
		label: 'Last 6 hours',
		value: '6h',
	},
	{
		label: 'Last 12 hours',
		value: '12h',
	},
	{
		label: 'Last 24 hours',
		value: '24h',
	},
];

function PublicDashboardSetting(): JSX.Element {
	const [publidDashboardData, setPublidDashboardData] = useState<
		PublicDashboardProps | undefined
	>(undefined);
	const [timeRangeEnabled, setTimeRangeEnabled] = useState(false);
	const [defaultTimeRange, setDefaultTimeRange] = useState('30m');
	const [, setCopyPublicDashboardURL] = useCopyToClipboard();

	const { selectedDashboard } = useDashboard();

	const handleDefaultTimeRange = useCallback((value: string): void => {
		setDefaultTimeRange(value);
	}, []);

	const handleTimeRangeEnabled = useCallback((): void => {
		setTimeRangeEnabled((prev) => !prev);
	}, []);

	const {
		data: publicDashboardResponse,
		isLoading: isLoadingPublicDashboard,
		refetch: refetchPublicDashboard,
		error: errorPublicDashboard,
	} = useGetPublicDashboard(selectedDashboard?.id || '');

	const isPublicDashboardEnabled = !!publidDashboardData?.publicPath;

	useEffect(() => {
		if (publicDashboardResponse?.data) {
			setPublidDashboardData(publicDashboardResponse?.data);
		}

		if (errorPublicDashboard) {
			console.error('Error getting public dashboard', errorPublicDashboard);
			setPublidDashboardData(undefined);
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
		onError: () => {
			toast.error('Failed to create public dashboard');
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
		onError: () => {
			toast.error('Failed to update public dashboard');
		},
	});

	const {
		mutate: revokePublicDashboardAccess,
		isLoading: isLoadingRevokePublicDashboardAccess,
		data: revokePublicDashboardAccessResponse,
	} = useMutation(revokePublicDashboardAccessAPI, {
		onSuccess: () => {
			toast.success('Public dashboard revoked successfully');
		},
		onError: () => {
			toast.error('Failed to revoke public dashboard');
		},
	});

	const handleCreatePublicDashboard = (): void => {
		if (!selectedDashboard) return;

		createPublicDashboard({
			dashboardId: selectedDashboard.id,
			timeRangeEnabled,
			defaultTimeRange,
		});
	};

	const handleUpdatePublicDashboard = (): void => {
		if (!selectedDashboard) return;

		updatePublicDashboard({
			dashboardId: selectedDashboard.id,
			timeRangeEnabled,
			defaultTimeRange,
		});
	};

	const handleRevokePublicDashboardAccess = (): void => {
		if (!selectedDashboard) return;

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
		if (!publicDashboardResponse?.data?.publicPath) return;

		try {
			setCopyPublicDashboardURL(publicDashboardResponse?.data?.publicPath);
			toast.success('Copied to clipboard successfully');
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
				<Typography.Text className="public-dashboard-setting-content-text">
					Access Settings: This dashboard is accessible to anyone who has the link.
				</Typography.Text>

				<div className="timerange-enabled-checkbox">
					<Checkbox
						id="time-range-enabled"
						checked={timeRangeEnabled}
						onCheckedChange={handleTimeRangeEnabled}
						labelName="Enable time range"
					/>
				</div>

				{timeRangeEnabled && (
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
							className="default-time-range-select-dropdown"
						/>
					</div>
				)}

				{isPublicDashboardEnabled && (
					<div className="public-dashboard-url">
						<Typography.Text className="url-label">
							Public Dashboard URL
						</Typography.Text>

						<div className="url-container">
							<Typography.Text className="url-text">
								{publicDashboardURL}
							</Typography.Text>

							<Button
								type="link"
								className="url-copy-btn periscope-btn ghost"
								icon={<Share size={12} />}
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

				<div className="public-dashboard-setting-actions">
					{!isPublicDashboardEnabled ? (
						<Button
							type="primary"
							className="create-public-dashboard-btn periscope-btn primary"
							disabled={isLoading}
							onClick={handleCreatePublicDashboard}
							loading={isLoadingCreatePublicDashboard}
							icon={<Globe size={14} />}
						>
							Enable Public Access
						</Button>
					) : (
						<>
							<Button
								type="primary"
								className="create-public-dashboard-btn periscope-btn primary"
								disabled={isLoading}
								onClick={handleUpdatePublicDashboard}
								loading={isLoadingUpdatePublicDashboard}
								icon={<Globe size={14} />}
							>
								Update Public Access
							</Button>
							<Button
								type="default"
								className="periscope-btn danger"
								disabled={isLoading}
								onClick={handleRevokePublicDashboardAccess}
								loading={isLoadingRevokePublicDashboardAccess}
								icon={<Trash size={14} />}
							>
								Revoke Public Access
							</Button>
						</>
					)}
				</div>
			</div>
		</div>
	);
}

export default PublicDashboardSetting;
