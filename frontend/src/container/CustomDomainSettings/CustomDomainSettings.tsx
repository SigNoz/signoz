/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import { useEffect, useMemo, useState } from 'react';
import { useCopyToClipboard } from 'react-use';
import { Color } from '@signozhq/design-tokens';
import {
	Alert,
	Button,
	Card,
	Form,
	Input,
	Modal,
	Skeleton,
	Tag,
	Typography,
} from 'antd';
import {
	RenderErrorResponseDTO,
	ZeustypesHostDTO,
} from 'api/generated/services/sigNoz.schemas';
import { useGetHosts, usePutHost } from 'api/generated/services/zeus';
import { AxiosError } from 'axios';
import LaunchChatSupport from 'components/LaunchChatSupport/LaunchChatSupport';
import { useNotifications } from 'hooks/useNotifications';
import { InfoIcon, Link2, Pencil } from 'lucide-react';
import { useAppContext } from 'providers/App/App';

import './CustomDomainSettings.styles.scss';

interface CustomDomainSettingsProps {
	subdomain: string;
}

export default function CustomDomainSettings(): JSX.Element {
	const { org } = useAppContext();
	const { notifications } = useNotifications();
	const [isEditModalOpen, setIsEditModalOpen] = useState(false);
	const [isPollingEnabled, setIsPollingEnabled] = useState(false);
	const [hosts, setHosts] = useState<ZeustypesHostDTO[] | null>(null);

	const [updateDomainError, setUpdateDomainError] = useState<AxiosError | null>(
		null,
	);

	const [, setCopyUrl] = useCopyToClipboard();

	const [
		customDomainDetails,
		setCustomDomainDetails,
	] = useState<CustomDomainSettingsProps | null>();

	const [editForm] = Form.useForm();

	const handleModalClose = (): void => {
		setIsEditModalOpen(false);
		editForm.resetFields();
		setUpdateDomainError(null);
	};

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

	const stripProtocol = (url: string): string => {
		return url?.split('://')[1] ?? url;
	};

	const dnsSuffix = useMemo(() => {
		const defaultHost = hosts?.find((h) => h.is_default);
		return defaultHost?.url && defaultHost?.name
			? defaultHost.url.split(`${defaultHost.name}.`)[1] || ''
			: '';
	}, [hosts]);

	useEffect(() => {
		if (isFetchingHosts) {
			return;
		}

		if (hostsData?.data?.status === 'success') {
			setHosts(hostsData?.data?.data?.hosts ?? null);

			const activeCustomDomain = hostsData?.data?.data?.hosts?.find(
				(host) => !host.is_default,
			);

			if (activeCustomDomain) {
				setCustomDomainDetails({
					subdomain: activeCustomDomain?.name || '',
				});
			}
		}

		if (hostsData?.data?.data?.state !== 'HEALTHY' && isPollingEnabled) {
			setTimeout(() => {
				refetchHosts();
			}, 3000);
		}

		if (hostsData?.data?.data?.state === 'HEALTHY') {
			setIsPollingEnabled(false);
		}
	}, [hostsData, refetchHosts, isPollingEnabled, isFetchingHosts]);

	const onUpdateCustomDomainSettings = (): void => {
		editForm
			.validateFields()
			.then((values) => {
				if (values.subdomain) {
					updateSubDomain(
						{ data: { name: values.subdomain } },
						{
							onSuccess: () => {
								setIsPollingEnabled(true);
								refetchHosts();
								setIsEditModalOpen(false);
							},
							onError: (error: AxiosError<RenderErrorResponseDTO>) => {
								setUpdateDomainError(error as AxiosError);
								setIsPollingEnabled(false);
							},
						},
					);

					setCustomDomainDetails({
						subdomain: values.subdomain,
					});
				}
			})
			.catch((errorInfo) => {
				console.error('error info', errorInfo);
			});
	};

	const onCopyUrlHandler = (url: string): void => {
		setCopyUrl(stripProtocol(url));
		notifications.success({
			message: 'Copied to clipboard',
		});
	};

	return (
		<div className="custom-domain-settings-container">
			<div className="custom-domain-settings-content">
				<header>
					<Typography.Title className="title">
						Custom Domain Settings
					</Typography.Title>
					<Typography.Text className="subtitle">
						Personalize your workspace domain effortlessly.
					</Typography.Text>
				</header>
			</div>

			<div className="custom-domain-settings-content">
				{!isLoadingHosts && (
					<Card className="custom-domain-settings-card">
						<div className="custom-domain-settings-content-header">
							Team {org?.[0]?.displayName} Information
						</div>

						<div className="custom-domain-settings-content-body">
							<div className="custom-domain-urls">
								{hosts?.map((host) => (
									<div
										className="custom-domain-url"
										key={host.name}
										onClick={(): void => onCopyUrlHandler(host.url || '')}
									>
										<Link2 size={12} /> {stripProtocol(host.url || '')}
										{host.is_default && <Tag color={Color.BG_ROBIN_500}>Default</Tag>}
									</div>
								))}
							</div>

							<div className="custom-domain-url-edit-btn">
								<Button
									className="periscope-btn"
									disabled={isLoadingHosts || isFetchingHosts || isPollingEnabled}
									type="default"
									icon={<Pencil size={10} />}
									onClick={(): void => setIsEditModalOpen(true)}
								>
									Customize team’s URL
								</Button>
							</div>
						</div>

						{isPollingEnabled && (
							<Alert
								className="custom-domain-update-status"
								message={`Updating your URL to ⎯ ${customDomainDetails?.subdomain}.${dnsSuffix}. This may take a few mins.`}
								type="info"
								icon={<InfoIcon size={12} />}
							/>
						)}
					</Card>
				)}

				{isLoadingHosts && (
					<Card className="custom-domain-settings-card">
						<Skeleton
							className="custom-domain-settings-skeleton"
							active
							paragraph={{ rows: 2 }}
						/>
					</Card>
				)}
			</div>

			{/* Update Custom Domain Modal */}
			<Modal
				className="custom-domain-settings-modal"
				title="Customize your team’s URL"
				open={isEditModalOpen}
				key="edit-custom-domain-settings-modal"
				afterClose={handleModalClose}
				// closable
				onCancel={handleModalClose}
				destroyOnClose
				footer={null}
			>
				<Form
					name="edit-custom-domain-settings-form"
					key={customDomainDetails?.subdomain}
					form={editForm}
					layout="vertical"
					autoComplete="off"
					initialValues={{
						subdomain: customDomainDetails?.subdomain,
					}}
				>
					{updateDomainError?.status !== 409 && (
						<>
							<div className="custom-domain-settings-modal-body">
								Enter your preferred subdomain to create a unique URL for your team.
								Need help? Contact support.
							</div>

							<Form.Item
								name="subdomain"
								label="Team’s URL subdomain"
								rules={[{ required: true }, { type: 'string', min: 3 }]}
							>
								<Input
									addonBefore={updateDomainError && <InfoIcon size={12} color="red" />}
									placeholder="Enter Domain"
									onChange={(): void => setUpdateDomainError(null)}
									addonAfter={dnsSuffix}
									autoFocus
								/>
							</Form.Item>
						</>
					)}

					{updateDomainError && (
						<div className="custom-domain-settings-modal-error">
							{updateDomainError.status === 409 ? (
								<Alert
									message={
										(updateDomainError?.response?.data as RenderErrorResponseDTO)?.error
											?.message ||
										'You’ve already updated the custom domain once today. To make further changes, please contact our support team for assistance.'
									}
									type="warning"
									className="update-limit-reached-error"
								/>
							) : (
								<Typography.Text type="danger">
									{
										(updateDomainError?.response?.data as RenderErrorResponseDTO)?.error
											?.message
									}
								</Typography.Text>
							)}
						</div>
					)}

					{updateDomainError?.status !== 409 && (
						<div className="custom-domain-settings-modal-footer">
							<Button
								className="periscope-btn primary apply-changes-btn"
								onClick={onUpdateCustomDomainSettings}
								loading={isLoadingUpdateCustomDomain}
							>
								Apply Changes
							</Button>
						</div>
					)}

					{updateDomainError?.status === 409 && (
						<div className="custom-domain-settings-modal-footer">
							<LaunchChatSupport
								attributes={{
									screen: 'Custom Domain Settings',
								}}
								eventName="Custom Domain Settings: Facing Issues Updating Custom Domain"
								message="Hi Team, I need help with updating custom domain"
								buttonText="Contact Support"
							/>
						</div>
					)}
				</Form>
			</Modal>
		</div>
	);
}
