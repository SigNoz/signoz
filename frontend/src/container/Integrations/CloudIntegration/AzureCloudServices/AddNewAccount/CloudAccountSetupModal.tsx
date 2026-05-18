import { useCallback, useRef, useState } from 'react';
import { Color } from '@signozhq/design-tokens';
import {
	ChevronDown,
	ChevronRight,
	LoaderCircle,
	SquareArrowOutUpRight,
} from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { Callout } from '@signozhq/ui/callout';
import { DrawerWrapper } from '@signozhq/ui/drawer';
import { Tabs } from '@signozhq/ui/tabs';
import { Form, Select, Spin } from 'antd';
import { useGetAccount } from 'api/generated/services/cloudintegration';
import { CloudintegrationtypesAccountDTO } from 'api/generated/services/sigNoz.schemas';
import CodeBlock from 'components/CodeBlock/CodeBlock';
import {
	AZURE_REGIONS,
	INTEGRATION_TYPES,
} from 'container/Integrations/constants';
import {
	IntegrationModalProps,
	ModalStateEnum,
} from 'container/Integrations/HeroSection/types';
import { popupContainer } from 'utils/selectPopupContainer';

import { useIntegrationModal } from '../../../../../hooks/integration/azure/useIntegrationModal';
import RenderConnectionFields from '../../AmazonWebServices/RegionForm/RenderConnectionParams';

import '../../AmazonWebServices/AddNewAccount/CloudAccountSetupModal.style.scss';

const AZURE_CLI_DESC =
	'Paste the following command if you have Azure CLI setup locally on your machine or use BASH CloudShell on Azure portal with above mentioned permissions.';
const AZURE_POWERSHELL_DESC =
	'Paste the following command in PowerShell CloudShell on Azure portal, you can switch to PowerShell on Azure portal.';

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

	const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(true);
	const [activeTab, setActiveTab] = useState('cli');

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
				<div className="cloud-account-setup-form__alert">
					<Callout
						title={
							<div className="cloud-account-setup-form__alert-message">
								<Spin
									indicator={
										<LoaderCircle
											size={14}
											className="anticon anticon-loading anticon-spin ant-spin-dot"
										/>
									}
								/>
								Waiting for Azure account connection, retrying in{' '}
								<span className="retry-time">10</span> secs...
							</div>
						}
						type="info"
						showIcon={false}
					/>
				</div>
			);
		}

		if (modalState === ModalStateEnum.ERROR) {
			return (
				<div className="cloud-account-setup-form__alert">
					<Callout
						title={
							<div className="cloud-account-setup-form__alert-message">
								We couldn&apos;t establish a connection to your Azure account. Please
								try again
							</div>
						}
						type="error"
					/>
				</div>
			);
		}

		return null;
	}, [modalState]);

	const footer = (
		<div className="cloud-account-setup-modal__footer">
			{modalState === ModalStateEnum.FORM && (
				<Button
					variant="solid"
					color="primary"
					prefix={<SquareArrowOutUpRight size={17} color={Color.BG_VANILLA_100} />}
					onClick={handleSubmit}
					loading={isLoading}
				>
					Generate Azure Setup Commands
				</Button>
			)}
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
								Ensure that you&apos;re logged in to the Azure workspace which you want
								to monitor.
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

				<Form
					form={form}
					className="cloud-account-setup-form"
					layout="vertical"
					initialValues={{ resourceGroups: [] }}
				>
					<div className="cloud-account-setup-form__content">
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
										label: `${region.label} (${region.value})`,
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
							<div className="cloud-account-setup-form__code-block-tabs-container">
								<div className="cloud-account-setup-form__code-block-tabs-header">
									<div className="cloud-account-setup-form__code-block-tabs-header-title">
										Deploy Agent
									</div>
									<div className="cloud-account-setup-form__code-block-tabs-header-description">
										{activeTab === 'cli' ? AZURE_CLI_DESC : AZURE_POWERSHELL_DESC}
									</div>
								</div>
								<Tabs
									className="cloud-account-setup-form__code-block-tabs"
									items={[
										{
											key: 'cli',
											label: 'CLI',
											children: <CodeBlock code={connectionCommands?.cliCommand || ''} />,
										},
										{
											key: 'powershell',
											label: 'PowerShell',
											children: (
												<CodeBlock
													code={connectionCommands?.cloudPowerShellCommand || ''}
												/>
											),
										},
									]}
									value={activeTab}
									onChange={(key): void => setActiveTab(key)}
									variant="primary"
								/>
							</div>
						)}

						{renderAlert()}

						{modalState === ModalStateEnum.WAITING && (
							<div className="cloud-account-setup-status-message">
								After running the command, return here and wait for automatic connection
								detection.
							</div>
						)}
					</div>
				</Form>
			</div>
		</DrawerWrapper>
	);
}

export default CloudAccountSetupModal;
