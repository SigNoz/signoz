import './IntegrationModal.style.scss';
import './AccountSettingsModal.style.scss';

import { Form, Modal, Select, Switch } from 'antd';
import { useUpdateAccountConfig } from 'hooks/integrations/aws/useUpdateAccountConfig';
import { isEqual } from 'lodash-es';
import IntergrationsUninstallBar from 'pages/Integrations/IntegrationDetailPage/IntegrationsUninstallBar';
import { ConnectionStates } from 'pages/Integrations/IntegrationDetailPage/TestConnection';
import { AWS_INTEGRATION } from 'pages/Integrations/IntegrationsList';
import {
	Dispatch,
	SetStateAction,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from 'react';
import { AccountConfigPayload } from 'types/api/integrations/aws';

import { regions } from '../ServicesSection/data';
import { CloudAccount } from '../ServicesSection/types';
import { RegionSelector } from './RegionSelector';

interface AccountSettingsModalProps {
	isOpen: boolean;
	onClose: () => void;
	account: CloudAccount;
	setActiveAccount: Dispatch<SetStateAction<CloudAccount | null>>;
}

const allRegions = (): string[] =>
	regions.flatMap((r) => r.subRegions.map((sr) => sr.name));

const getRegionPreviewText = (regions: string[] | undefined): string[] => {
	if (!regions) return [];
	if (regions.includes('all')) {
		return allRegions();
	}
	return regions;
};

function AccountSettingsModal({
	isOpen,
	onClose,
	account,
	setActiveAccount,
}: AccountSettingsModalProps): JSX.Element {
	const [form] = Form.useForm();
	const { mutate: updateConfig, isLoading } = useUpdateAccountConfig();
	const accountRegions = useMemo(() => account?.config?.regions || [], [
		account?.config?.regions,
	]);
	const [isInitialRegionsSet, setIsInitialRegionsSet] = useState(false);

	const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
	const [includeAllRegions, setIncludeAllRegions] = useState(false);
	const [isRegionSelectOpen, setIsRegionSelectOpen] = useState(false);

	// Initialize regions from account when modal opens
	useEffect(() => {
		if (accountRegions.length > 0 && !isInitialRegionsSet) {
			setSelectedRegions(accountRegions);
			setIsInitialRegionsSet(true);
			setIncludeAllRegions(accountRegions.includes('all'));
		}
	}, [accountRegions, isInitialRegionsSet]);

	const handleSubmit = useCallback(async (): Promise<void> => {
		try {
			await form.validateFields();
			const payload: AccountConfigPayload = {
				config: {
					regions: selectedRegions,
				},
			};

			updateConfig(
				{ accountId: account?.id, payload },
				{
					onSuccess: (response) => {
						setActiveAccount(response.data);
						onClose();
					},
				},
			);
		} catch (error) {
			console.error('Form submission failed:', error);
		}
	}, [
		form,
		selectedRegions,
		updateConfig,
		account?.id,
		setActiveAccount,
		onClose,
	]);

	const isSaveDisabled = useMemo(
		() => isEqual(selectedRegions.sort(), accountRegions.sort()),
		[selectedRegions, accountRegions],
	);

	const handleIncludeAllRegionsChange = useCallback((checked: boolean): void => {
		setIncludeAllRegions(checked);
		if (checked) {
			setSelectedRegions(['all']);
		} else {
			setSelectedRegions([]);
		}
	}, []);

	const handleClose = useCallback(() => {
		setIsRegionSelectOpen(false);
		onClose();
	}, [onClose]);

	return (
		<Modal
			title={
				<div className="account-settings-modal__title">
					Account settings for{' '}
					<span className="account-settings-modal__title-account-id">
						{account?.id}
					</span>
				</div>
			}
			centered
			open={isOpen}
			okText="Save"
			okButtonProps={{
				disabled: isSaveDisabled,
				className: 'account-settings-modal__footer-save-button',
				loading: isLoading,
			}}
			onCancel={handleClose}
			onOk={handleSubmit}
			cancelText="Close"
			cancelButtonProps={{
				className: 'account-settings-modal__footer-close-button',
			}}
			width={672}
			rootClassName="cloud-integrations-modal account-settings-modal"
		>
			<Form
				form={form}
				layout="vertical"
				initialValues={{
					selectedRegions,
					includeAllRegions,
				}}
			>
				<div className="account-settings-modal__body">
					<div className="account-settings-modal__body-account-info">
						<div className="account-settings-modal__body-account-info-connected-account-details">
							<div className="account-settings-modal__body-account-info-connected-account-details-title">
								Connected Account details
							</div>
							<div className="account-settings-modal__body-account-info-connected-account-details-account-id">
								AWS Account:{' '}
								<span className="account-settings-modal__body-account-info-connected-account-details-account-id-account-id">
									{account?.id}
								</span>
							</div>
						</div>
					</div>

					<Form.Item
						name="selectedRegions"
						rules={[
							{
								validator: async (): Promise<void> => {
									if (selectedRegions.length === 0) {
										throw new Error('Please select at least one region to monitor');
									}
								},
								message: 'Please select at least one region to monitor',
							},
						]}
					>
						{isRegionSelectOpen ? (
							<RegionSelector
								selectedRegions={selectedRegions}
								setSelectedRegions={setSelectedRegions}
								setIncludeAllRegions={setIncludeAllRegions}
							/>
						) : (
							<>
								<div className="account-settings-modal__body-regions-switch-switch">
									<Switch
										checked={includeAllRegions}
										onChange={handleIncludeAllRegionsChange}
									/>
									<button
										className="account-settings-modal__body-regions-switch-switch-label"
										type="button"
										onClick={(): void =>
											handleIncludeAllRegionsChange(!includeAllRegions)
										}
									>
										Include all regions
									</button>
								</div>
								<Select
									style={{ height: '44px' }}
									suffixIcon={null}
									placeholder="Select Region(s)"
									className="cloud-integrations-form__select monitor-regions"
									onClick={(): void => setIsRegionSelectOpen(true)}
									mode="multiple"
									maxTagCount={3}
									value={getRegionPreviewText(selectedRegions)}
									open={isRegionSelectOpen}
								/>
							</>
						)}
					</Form.Item>

					<div className="integration-detail-content">
						<IntergrationsUninstallBar
							integrationTitle={AWS_INTEGRATION.title}
							integrationId={AWS_INTEGRATION.id}
							onUnInstallSuccess={handleClose}
							removeIntegrationTitle="Remove"
							connectionStatus={ConnectionStates.Connected}
						/>
					</div>
				</div>
			</Form>
		</Modal>
	);
}

export default AccountSettingsModal;
