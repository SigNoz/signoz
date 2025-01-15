/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import './CustomDomainSettings.styles.scss';

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
import updateSubDomainAPI from 'api/customDomain/updateSubDomain';
import { AxiosError } from 'axios';
import LaunchChatSupport from 'components/LaunchChatSupport/LaunchChatSupport';
import { useGetDeploymentsData } from 'hooks/CustomDomain/useGetDeploymentsData';
import { useNotifications } from 'hooks/useNotifications';
import { InfoIcon, Link2, Pencil } from 'lucide-react';
import { useAppContext } from 'providers/App/App';
import { useEffect, useState } from 'react';
import { useMutation } from 'react-query';
import { useCopyToClipboard } from 'react-use';
import { HostsProps } from 'types/api/customDomain/types';

interface CustomDomainSettingsProps {
	subdomain: string;
}

export default function CustomDomainSettings(): JSX.Element {
	const { org } = useAppContext();
	const { notifications } = useNotifications();
	const [isEditModalOpen, setIsEditModalOpen] = useState(false);
	const [isPollingEnabled, setIsPollingEnabled] = useState(false);
	const [hosts, setHosts] = useState<HostsProps[] | null>(null);

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
		data: deploymentsData,
		isLoading: isLoadingDeploymentsData,
		isFetching: isFetchingDeploymentsData,
		refetch: refetchDeploymentsData,
	} = useGetDeploymentsData();

	const {
		mutate: updateSubDomain,
		isLoading: isLoadingUpdateCustomDomain,
	} = useMutation(updateSubDomainAPI, {
		onSuccess: () => {
			setIsPollingEnabled(true);
			refetchDeploymentsData();
			setIsEditModalOpen(false);
		},
		onError: (error: AxiosError) => {
			setUpdateDomainError(error);
			setIsPollingEnabled(false);
		},
	});

	useEffect(() => {
		if (isFetchingDeploymentsData) {
			return;
		}

		if (deploymentsData?.data?.status === 'success') {
			setHosts(deploymentsData.data.data.hosts);

			const activeCustomDomain = deploymentsData.data.data.hosts.find(
				(host) => !host.is_default,
			);

			if (activeCustomDomain) {
				setCustomDomainDetails({
					subdomain: activeCustomDomain?.name || '',
				});
			}
		}

		if (deploymentsData?.data?.data?.state !== 'HEALTHY' && isPollingEnabled) {
			setTimeout(() => {
				refetchDeploymentsData();
			}, 3000);
		}

		if (deploymentsData?.data?.data.state === 'HEALTHY') {
			setIsPollingEnabled(false);
		}
	}, [
		deploymentsData,
		refetchDeploymentsData,
		isPollingEnabled,
		isFetchingDeploymentsData,
	]);

	const onUpdateCustomDomainSettings = (): void => {
		editForm
			.validateFields()
			.then((values) => {
				if (values.subdomain) {
					updateSubDomain({
						data: {
							name: values.subdomain,
						},
					});

					setCustomDomainDetails({
						subdomain: values.subdomain,
					});
				}
			})
			.catch((errorInfo) => {
				console.error('error info', errorInfo);
			});
	};

	const onCopyUrlHandler = (host: string): void => {
		const url = `${host}.${deploymentsData?.data.data.cluster.region.dns}`;

		setCopyUrl(url);
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
				{!isLoadingDeploymentsData && (
					<Card className="custom-domain-settings-card">
						<div className="custom-domain-settings-content-header">
							Team {org?.[0]?.name} Information
						</div>

						<div className="custom-domain-settings-content-body">
							<div className="custom-domain-urls">
								{hosts?.map((host) => (
									<div
										className="custom-domain-url"
										key={host.name}
										onClick={(): void => onCopyUrlHandler(host.name)}
									>
										<Link2 size={12} /> {host.name}.
										{deploymentsData?.data.data.cluster.region.dns}
										{host.is_default && <Tag color={Color.BG_ROBIN_500}>Default</Tag>}
									</div>
								))}
							</div>

							<div className="custom-domain-url-edit-btn">
								<Button
									className="periscope-btn"
									disabled={
										isLoadingDeploymentsData ||
										isFetchingDeploymentsData ||
										isPollingEnabled
									}
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
								message={`Updating your URL to ⎯ ${customDomainDetails?.subdomain}.${deploymentsData?.data.data.cluster.region.dns}. This may take a few mins.`}
								type="info"
								icon={<InfoIcon size={12} />}
							/>
						)}
					</Card>
				)}

				{isLoadingDeploymentsData && (
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
									addonAfter={deploymentsData?.data.data.cluster.region.dns}
									autoFocus
								/>
							</Form.Item>
						</>
					)}

					{updateDomainError && (
						<div className="custom-domain-settings-modal-error">
							{updateDomainError.status === 409 ? (
								<Alert
									message="You’ve already updated the custom domain once today. To make further changes, please contact our support team for assistance."
									type="warning"
									className="update-limit-reached-error"
								/>
							) : (
								<Typography.Text type="danger">
									{(updateDomainError.response?.data as { error: string })?.error}
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
