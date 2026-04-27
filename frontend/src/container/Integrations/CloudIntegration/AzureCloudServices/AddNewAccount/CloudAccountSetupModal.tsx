import { useCallback, useRef, useState } from 'react';
import { Color } from '@signozhq/design-tokens';
import { ChevronDown, ChevronRight } from '@signozhq/icons';
import { Button, DrawerWrapper } from '@signozhq/ui';
import { Alert, Form, Select, Spin, Typography } from 'antd';
import { useGetAccount } from 'api/generated/services/cloudintegration';
import { CloudintegrationtypesAccountDTO } from 'api/generated/services/sigNoz.schemas';
import {
	AZURE_REGIONS,
	INTEGRATION_TYPES,
} from 'container/Integrations/constants';
import {
	IntegrationModalProps,
	ModalStateEnum,
} from 'container/Integrations/HeroSection/types';
import {
	LoaderCircle,
	SquareArrowOutUpRight,
	TriangleAlert,
} from 'lucide-react';
import { popupContainer } from 'utils/selectPopupContainer';

import { useIntegrationModal } from '../../../../../hooks/integration/azure/useIntegrationModal';
import RenderConnectionFields from '../../AmazonWebServices/RegionForm/RenderConnectionParams';

import '../../AmazonWebServices/AddNewAccount/CloudAccountSetupModal.style.scss';

function CloudAccountSetupModal({
	onClose,
}: IntegrationModalProps): JSX.Element {
	const {
		form,
		modalState,
		isLoading,
		accountId,
		connectionCommands,
		handleSubmit,
		handleClose,
		connectionParams,
		isConnectionParamsLoading,
		handleConnectionSuccess,
		handleConnectionTimeout,
		handleConnectionError,
	} = useIntegrationModal({ onClose });

	const startTimeRef = useRef(Date.now());
	const refetchInterval = 10 * 1000;
	const errorTimeout = 10 * 60 * 1000;

	const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false);

	useGetAccount(
		{
			cloudProvider: INTEGRATION_TYPES.AZURE,
			id: accountId ?? '',
		},
		{
			query: {
				enabled: Boolean(accountId) && modalState === ModalStateEnum.WAITING,
				refetchInterval,
				select: (response): CloudintegrationtypesAccountDTO => response.data,
				onSuccess: (account) => {
					const isConnected =
						Boolean(account.providerAccountId) && account.removedAt === null;

					if (isConnected) {
						handleConnectionSuccess({
							cloudAccountId: account.providerAccountId ?? account.id,
							status: account.agentReport,
						});
					} else if (Date.now() - startTimeRef.current >= errorTimeout) {
						handleConnectionTimeout({ id: accountId });
					}
				},
				onError: () => {
					handleConnectionError();
				},
			},
		},
	);

	const renderAlert = useCallback((): JSX.Element | null => {
		if (modalState === ModalStateEnum.WAITING) {
			return (
				<Alert
					message={
						<div className="cloud-account-setup-form__alert-message">
							<Spin
								indicator={
									<LoaderCircle
										size={14}
										color={Color.BG_AMBER_400}
										className="anticon anticon-loading anticon-spin ant-spin-dot"
									/>
								}
							/>
							Waiting for Azure account connection, retrying in{' '}
							<span className="retry-time">10</span> secs...
						</div>
					}
					className="cloud-account-setup-form__alert"
					type="warning"
				/>
			);
		}

		if (modalState === ModalStateEnum.ERROR) {
			return (
				<Alert
					message={
						<div className="cloud-account-setup-form__alert-message">
							<TriangleAlert size={15} color={Color.BG_SAKURA_400} />
							{
								"We couldn't establish a connection to your Azure account. Please try again"
							}
						</div>
					}
					type="error"
					className="cloud-account-setup-form__alert"
				/>
			);
		}

		return null;
	}, [modalState]);

	const footer = (
		<div className="cloud-account-setup-modal__footer">
			<Button
				variant="solid"
				color="primary"
				prefix={<SquareArrowOutUpRight size={17} color={Color.BG_VANILLA_100} />}
				onClick={handleSubmit}
				loading={isLoading}
				disabled={modalState === ModalStateEnum.WAITING}
			>
				Generate Azure Setup Commands
			</Button>
		</div>
	);

	return (
		<DrawerWrapper
			open={true}
			className="cloud-account-setup-modal"
			onOpenChange={(open): void => {
				if (!open) {
					handleClose();
				}
			}}
			direction="right"
			showCloseButton
			title="Add Azure Account"
			width="wide"
			footer={footer}
		>
			<div className="cloud-account-setup-modal__content">
				<Form
					form={form}
					className="cloud-account-setup-form"
					layout="vertical"
					initialValues={{ resourceGroups: [] }}
				>
					{renderAlert()}

					<div className="cloud-account-setup-form__content">
						<div className="cloud-account-setup-prerequisites">
							<div className="cloud-account-setup-prerequisites__title">
								Prerequisites
							</div>

							<ul className="cloud-account-setup-prerequisites__list">
								<li className="cloud-account-setup-prerequisites__list-item">
									<span className="cloud-account-setup-prerequisites__list-item-bullet">
										—
									</span>{' '}
									<span className="cloud-account-setup-prerequisites__list-item-text">
										Ensure that you&apos;re logged in to the Azure workspace which you
										want to monitor.
									</span>
								</li>
								<li className="cloud-account-setup-prerequisites__list-item">
									<span className="cloud-account-setup-prerequisites__list-item-bullet">
										—
									</span>{' '}
									<span className="cloud-account-setup-prerequisites__list-item-text">
										Ensure that you either have the{' '}
										<span className="cloud-account-setup-prerequisites__list-item-highlight">
											Owner
										</span>{' '}
										role OR
									</span>
								</li>
								<li className="cloud-account-setup-prerequisites__list-item">
									<span className="cloud-account-setup-prerequisites__list-item-bullet">
										—
									</span>{' '}
									<span className="cloud-account-setup-prerequisites__list-item-text">
										Both the{' '}
										<span className="cloud-account-setup-prerequisites__list-item-highlight">
											Contributor
										</span>{' '}
										and{' '}
										<span className="cloud-account-setup-prerequisites__list-item-highlight">
											user access admin
										</span>{' '}
										roles
									</span>
								</li>
							</ul>
						</div>

						<div className="cloud-account-setup-how-it-works-accordion">
							<div
								className={`cloud-account-setup-how-it-works-accordion__title ${
									isHowItWorksOpen ? 'open' : ''
								}`}
							>
								<Button
									variant="link"
									color="secondary"
									onClick={(): void => setIsHowItWorksOpen(!isHowItWorksOpen)}
									prefix={isHowItWorksOpen ? <ChevronDown /> : <ChevronRight />}
								/>

								<span className="cloud-account-setup-how-it-works-accordion__title-text">
									How it works?
								</span>
							</div>
							{isHowItWorksOpen && (
								<div className="cloud-account-setup-how-it-works-accordion__description">
									<div className="cloud-account-setup-how-it-works-accordion__description-item">
										SigNoz will create new resource-group to manage the resources required
										for this integration. The following steps will create a User-Assigned
										Managed Identity with the necessary permissions and follows the
										Principle of Least Privilege.
									</div>
									<div className="cloud-account-setup-how-it-works__description-item">
										Once the Integration template is deployed, you can enable the services
										you want to monitor right here in Signoz dashboard.
									</div>
								</div>
							)}
						</div>

						<div className="cloud-account-setup-form__form-group">
							<div className="cloud-account-setup-form__title">
								Where should we deploy the SigNoz collector resources?
							</div>
							<div className="cloud-account-setup-form__description">
								Choose the Azure region for deployment.
							</div>
							<Form.Item
								name="region"
								rules={[{ required: true, message: 'Please select a region' }]}
								className="cloud-account-setup-form__form-item"
							>
								<Select
									placeholder="e.g. East US"
									options={AZURE_REGIONS.map((region) => ({
										label: region.label,
										value: region.value,
									}))}
									getPopupContainer={popupContainer}
									disabled={modalState === ModalStateEnum.WAITING}
								/>
							</Form.Item>
						</div>

						<div className="cloud-account-setup-form__form-group">
							<div className="cloud-account-setup-form__title">
								Which resource groups do you want to monitor?
							</div>
							<div className="cloud-account-setup-form__description">
								Add one or more Azure resource group names.
							</div>
							<Form.Item
								name="resourceGroups"
								rules={[
									{
										required: true,
										type: 'array',
										min: 1,
										message: 'Please add at least one resource group',
									},
								]}
								className="cloud-account-setup-form__form-item"
							>
								<Select
									mode="tags"
									placeholder="e.g. prod-platform-rg"
									tokenSeparators={[',']}
									disabled={modalState === ModalStateEnum.WAITING}
								/>
							</Form.Item>
						</div>

						<RenderConnectionFields
							isConnectionParamsLoading={isConnectionParamsLoading}
							connectionParams={connectionParams}
							isFormDisabled={modalState === ModalStateEnum.WAITING}
						/>

						{connectionCommands && (
							<div className="cloud-account-setup-form__form-group">
								<div className="cloud-account-setup-form__title">
									Run one of these commands in your Azure environment
								</div>
								<Typography.Paragraph copyable className="cloud-account-command">
									{connectionCommands.cliCommand}
								</Typography.Paragraph>
								<Typography.Paragraph copyable className="cloud-account-command">
									{connectionCommands.cloudPowerShellCommand}
								</Typography.Paragraph>
							</div>
						)}

						{modalState === ModalStateEnum.WAITING && (
							<div className="cloud-account-setup-form__form-group">
								<Typography.Text type="secondary">
									After running the command, return here and wait for automatic
									connection detection.
								</Typography.Text>
							</div>
						)}
					</div>
				</Form>
			</div>
		</DrawerWrapper>
	);
}

export default CloudAccountSetupModal;
