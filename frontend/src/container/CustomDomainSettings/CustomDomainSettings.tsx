import { useEffect, useMemo, useState } from 'react';
import {
	Check,
	ChevronDown,
	Clock,
	ExternalLink,
	FilePenLine,
	Link2,
	SolidAlertCircle,
	X,
} from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { Callout } from '@signozhq/ui/callout';
import { Dropdown, type DropdownItemType } from '@signozhq/ui/dropdown';
import { toast } from '@signozhq/ui/sonner';
import { Skeleton } from 'antd';
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

function DomainUpdateToast({
	toastId,
	url,
}: {
	toastId: string | number;
	url: string;
}): JSX.Element {
	const displayUrl = url?.split('://')[1] ?? url;

	return (
		<div className="custom-domain-toast">
			<span className="custom-domain-toast-message">
				Your workspace URL is being updated to <strong>{displayUrl}</strong>. This
				may take a few minutes.
			</span>
			<div className="custom-domain-toast-actions">
				<Button
					color="secondary"
					variant="ghost"
					size="sm"
					className="custom-domain-toast-visit-btn"
					suffix={<ExternalLink size={12} />}
					onClick={(): void => {
						// oxlint-disable-next-line signoz/no-raw-absolute-path
						window.open(url, '_blank', 'noopener,noreferrer');
					}}
				>
					Visit new URL
				</Button>
				<Button
					color="secondary"
					variant="ghost"
					size="sm"
					icon
					className="custom-domain-toast-dismiss-btn"
					onClick={(): void => {
						toast.dismiss(toastId);
					}}
					aria-label="Dismiss"
				>
					<X size={14} />
				</Button>
			</div>
		</div>
	);
}

export default function CustomDomainSettings(): JSX.Element {
	const { org } = useAppContext();
	const { timezone } = useTimezone();

	const [isEditModalOpen, setIsEditModalOpen] = useState(false);
	const [isPollingEnabled, setIsPollingEnabled] = useState(false);
	const [hosts, setHosts] = useState<ZeustypesHostDTO[] | null>(null);

	const [updateDomainError, setUpdateDomainError] =
		useState<AxiosError<RenderErrorResponseDTO> | null>(null);

	const [customDomainSubdomain, setCustomDomainSubdomain] = useState<
		string | undefined
	>();

	const {
		data: hostsData,
		isLoading: isLoadingHosts,
		isFetching: isFetchingHosts,
		refetch: refetchHosts,
	} = useGetHosts();

	const { mutate: updateSubDomain, isLoading: isLoadingUpdateCustomDomain } =
		usePutHost<AxiosError<RenderErrorResponseDTO>>();

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
					void refetchHosts();
					setIsEditModalOpen(false);
					setCustomDomainSubdomain(subdomain);
					const newUrl = `https://${subdomain}.${dnsSuffix}`;
					toast.custom(
						(toastId) => <DomainUpdateToast toastId={toastId} url={newUrl} />,
						{ duration: 5000, position: 'bottom-right' }, // this 5 sec is as per design
					);
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

	const workspaceName =
		org?.[0]?.displayName || customDomainSubdomain || activeHost?.name;

	const workspaceUrlItems: DropdownItemType[] = [
		{
			type: 'group',
			value: 'all-workspace-urls',
			label: 'All Workspace URLs',
			items: sortedHosts.map((host) => ({
				type: 'link',
				value: host.name,
				label: stripProtocol(host.url),
				suffix:
					host.name === activeHost?.name ? (
						<Check size={14} />
					) : (
						<ExternalLink size={12} />
					),
				render: (
					<a
						href={host.url}
						target="_blank"
						rel="noopener noreferrer"
						aria-label={stripProtocol(host.url)}
					/>
				),
			})),
		},
	];

	if (isLoadingHosts) {
		return (
			<div className="custom-domain-card custom-domain-card--loading">
				<Skeleton active paragraph={{ rows: 1, width: '60%' }} />
			</div>
		);
	}

	return (
		<>
			<div className="custom-domain-card-top">
				<div className="custom-domain-card-info">
					{!!workspaceName && (
						<div className="custom-domain-card-name-row">
							<span className="beacon" />
							<span className="custom-domain-card-org-name">{workspaceName}</span>
						</div>
					)}

					<div
						className={`custom-domain-card-meta-row ${
							!workspaceName ? 'workspace-name-hidden' : ''
						}`}
					>
						<Dropdown
							items={workspaceUrlItems}
							nativeButton
							align="start"
							side="bottom"
						>
							<Button
								size="md"
								variant="link"
								color="secondary"
								testId="custom-domain-menu-trigger"
								loading={isFetchingHosts}
								prefix={<Link2 size={12} />}
								suffix={<ChevronDown size={12} />}
							>
								<span>{stripProtocol(activeHost?.url ?? '')}</span>
							</Button>
						</Dropdown>
						<span className="custom-domain-card-meta-timezone">
							<Clock size={11} />
							{timezone.offset}
						</span>
					</div>
				</div>

				<Button
					disabledTooltip="Wait for the URL update to finish"
					size="md"
					variant="solid"
					color="secondary"
					prefix={<FilePenLine size={12} />}
					disabled={isPollingEnabled}
					loading={isFetchingHosts}
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
					title={`Updating your URL to ⎯ ${customDomainSubdomain}.${dnsSuffix}. This may take a few mins.`}
				/>
			)}

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
