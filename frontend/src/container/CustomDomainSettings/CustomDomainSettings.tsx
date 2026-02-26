import { useEffect, useMemo, useState } from 'react';
import { Button } from '@signozhq/button';
import { Callout } from '@signozhq/callout';
import {
	Check,
	ChevronDown,
	Clock,
	FilePenLine,
	Link2,
	SolidAlertCircle,
} from '@signozhq/icons';
import { Dropdown, Skeleton } from 'antd';
import {
	RenderErrorResponseDTO,
	ZeustypesHostDTO,
} from 'api/generated/services/sigNoz.schemas';
import { useGetHosts, usePutHost } from 'api/generated/services/zeus';
import { AxiosError } from 'axios';
import { useAppContext } from 'providers/App/App';
import { useTimezone } from 'providers/Timezone';

import CustomDomainEditModal from './CustomDomainEditModal';

import './CustomDomainSettings.styles.scss';

export default function CustomDomainSettings(): JSX.Element {
	const { org, activeLicense } = useAppContext();
	const { timezone } = useTimezone();
	const [isEditModalOpen, setIsEditModalOpen] = useState(false);
	const [isPollingEnabled, setIsPollingEnabled] = useState(false);
	const [hosts, setHosts] = useState<ZeustypesHostDTO[] | null>(null);

	const [
		updateDomainError,
		setUpdateDomainError,
	] = useState<AxiosError<RenderErrorResponseDTO> | null>(null);

	const [customDomainSubdomain, setCustomDomainSubdomain] = useState<
		string | undefined
	>();

	const {
		data: hostsData,
		isLoading: isLoadingHosts,
		isFetching: isFetchingHosts,
		refetch: refetchHosts,
	} = useGetHosts();

	const {
		mutate: updateSubDomain,
		isLoading: isLoadingUpdateCustomDomain,
	} = usePutHost<AxiosError<RenderErrorResponseDTO>>();

	const stripProtocol = (url: string): string => url?.split('://')[1] ?? url;

	const dnsSuffix = useMemo(() => {
		const defaultHost = hosts?.find((h) => h.is_default);
		return defaultHost?.url && defaultHost?.name
			? defaultHost.url.split(`${defaultHost.name}.`)[1] || ''
			: '';
	}, [hosts]);

	const activeHost = useMemo(
		() => hosts?.find((h) => !h.is_default) ?? hosts?.find((h) => h.is_default),
		[hosts],
	);

	useEffect(() => {
		if (isFetchingHosts || !hostsData) {
			return;
		}

		if (hostsData.status === 'success') {
			setHosts(hostsData.data.hosts ?? null);
			const customHost = hostsData.data.hosts?.find((h) => !h.is_default);
			if (customHost) {
				setCustomDomainSubdomain(customHost.name || '');
			}
		}

		if (hostsData.data.state !== 'HEALTHY' && isPollingEnabled) {
			setTimeout(() => refetchHosts(), 3000);
		}

		if (hostsData.data.state === 'HEALTHY') {
			setIsPollingEnabled(false);
		}
	}, [hostsData, refetchHosts, isPollingEnabled, isFetchingHosts]);

	const handleSubmit = (subdomain: string): void => {
		updateSubDomain(
			{ data: { name: subdomain } },
			{
				onSuccess: () => {
					setIsPollingEnabled(true);
					refetchHosts();
					setIsEditModalOpen(false);
					setCustomDomainSubdomain(subdomain);
				},
				onError: (error: AxiosError<RenderErrorResponseDTO>) => {
					setUpdateDomainError(error as AxiosError<RenderErrorResponseDTO>);
					setIsPollingEnabled(false);
				},
			},
		);
	};

	const sortedHosts = useMemo(
		() =>
			[...(hosts ?? [])].sort((a, b) => {
				if (a.name === activeHost?.name) {
					return -1;
				}
				if (b.name === activeHost?.name) {
					return 1;
				}
				if (a.is_default && !b.is_default) {
					return 1;
				}
				if (!a.is_default && b.is_default) {
					return -1;
				}
				return 0;
			}),
		[hosts, activeHost],
	);

	const planName = activeLicense?.plan?.name;

	if (isLoadingHosts || isFetchingHosts) {
		return (
			<div className="custom-domain-card custom-domain-card--loading">
				<Skeleton
					active
					title={{ width: '40%' }}
					paragraph={{ rows: 1, width: '60%' }}
				/>
			</div>
		);
	}

	return (
		<>
			<div className="custom-domain-card">
				<div className="custom-domain-card-top">
					<div className="custom-domain-card-info">
						<div className="custom-domain-card-name-row">
							<span className="beacon" />
							<span className="custom-domain-card-org-name">
								{org?.[0]?.displayName ? org?.[0]?.displayName : customDomainSubdomain}
							</span>
						</div>

						<div className="custom-domain-card-meta-row">
							<Dropdown
								trigger={['click']}
								dropdownRender={(): JSX.Element => (
									<div className="workspace-url-dropdown">
										<span className="workspace-url-dropdown-header">
											All Workspace URLs
										</span>
										<div className="workspace-url-dropdown-divider" />
										{sortedHosts.map((host) => {
											const isActive = host.name === activeHost?.name;
											return (
												<div
													key={host.name}
													className={`workspace-url-dropdown-item${
														isActive ? ' workspace-url-dropdown-item--active' : ''
													}`}
												>
													<span className="workspace-url-dropdown-item-label">
														{stripProtocol(host.url ?? '')}
													</span>
													{isActive && (
														<Check size={14} className="workspace-url-dropdown-item-check" />
													)}
												</div>
											);
										})}
									</div>
								)}
							>
								<button
									type="button"
									className="workspace-url-trigger"
									disabled={isFetchingHosts}
								>
									<Link2 size={12} />
									<span>{stripProtocol(activeHost?.url ?? '')}</span>
									<ChevronDown size={12} />
								</button>
							</Dropdown>
							<span className="custom-domain-card-meta-timezone">
								<Clock size={11} />
								{timezone.offset}
							</span>
						</div>
					</div>

					<Button
						variant="solid"
						size="sm"
						className="custom-domain-edit-button"
						prefixIcon={<FilePenLine size={12} />}
						disabled={isFetchingHosts || isPollingEnabled}
						onClick={(): void => setIsEditModalOpen(true)}
					>
						Edit workspace link
					</Button>
				</div>

				{isPollingEnabled && (
					<Callout
						type="info"
						showIcon
						className="custom-domain-callout"
						size="small"
						icon={<SolidAlertCircle size={13} color="primary" />}
						message={`Updating your URL to ⎯ ${customDomainSubdomain}.${dnsSuffix}. This may take a few mins.`}
					/>
				)}

				<div className="custom-domain-card-divider" />

				<div className="custom-domain-card-bottom">
					<span className="beacon" />
					<span className="custom-domain-card-license">
						{planName && <code className="custom-domain-plan-badge">{planName}</code>}{' '}
						license is currently active
					</span>
				</div>
			</div>

			<CustomDomainEditModal
				isOpen={isEditModalOpen}
				onClose={(): void => setIsEditModalOpen(false)}
				customDomainSubdomain={customDomainSubdomain}
				dnsSuffix={dnsSuffix}
				isLoading={isLoadingUpdateCustomDomain}
				updateDomainError={updateDomainError}
				onClearError={(): void => setUpdateDomainError(null)}
				onSubmit={handleSubmit}
			/>
		</>
	);
}
