import './AccountSettingsModal.style.scss';

import { Form, Select, Switch } from 'antd';
import SignozModal from 'components/SignozModal/SignozModal';
import {
	getRegionPreviewText,
	useAccountSettingsModal,
} from 'hooks/integrations/aws/useAccountSettingsModal';
import IntergrationsUninstallBar from 'pages/Integrations/IntegrationDetailPage/IntegrationsUninstallBar';
import { ConnectionStates } from 'pages/Integrations/IntegrationDetailPage/TestConnection';
import { AWS_INTEGRATION } from 'pages/Integrations/IntegrationsList';
import { Dispatch, SetStateAction, useCallback } from 'react';

import { CloudAccount } from '../../ServicesSection/types';
import { RegionSelector } from './RegionSelector';

interface AccountSettingsModalProps {
	isOpen: boolean;
	onClose: () => void;
	account: CloudAccount;
	setActiveAccount: Dispatch<SetStateAction<CloudAccount | null>>;
}

function AccountSettingsModal({
	isOpen,
	onClose,
	account,
	setActiveAccount,
}: AccountSettingsModalProps): JSX.Element {
	const {
		form,
		isLoading,
		selectedRegions,
		includeAllRegions,
		isRegionSelectOpen,
		isSaveDisabled,
		setSelectedRegions,
		setIncludeAllRegions,
		setIsRegionSelectOpen,
		handleIncludeAllRegionsChange,
		handleSubmit,
		handleClose,
	} = useAccountSettingsModal({ onClose, account, setActiveAccount });

	const renderRegionSelector = useCallback(() => {
		if (isRegionSelectOpen) {
			return (
				<RegionSelector
					selectedRegions={selectedRegions}
					setSelectedRegions={setSelectedRegions}
					setIncludeAllRegions={setIncludeAllRegions}
				/>
			);
		}

		return (
			<>
				<div className="account-settings-modal__body-regions-switch-switch ">
					<Switch
						checked={includeAllRegions}
						onChange={handleIncludeAllRegionsChange}
					/>
					<button
						className="account-settings-modal__body-regions-switch-switch-label"
						type="button"
						onClick={(): void => handleIncludeAllRegionsChange(!includeAllRegions)}
					>
						Include all regions
					</button>
				</div>
				<Select
					style={{ height: '44px' }}
					suffixIcon={null}
					placeholder="Select Region(s)"
					className="cloud-account-setup-form__select account-settings-modal__body-regions-select"
					onClick={(): void => setIsRegionSelectOpen(true)}
					mode="multiple"
					maxTagCount={3}
					value={getRegionPreviewText(selectedRegions)}
					open={false}
				/>
			</>
		);
	}, [
		isRegionSelectOpen,
		selectedRegions,
		includeAllRegions,
		handleIncludeAllRegionsChange,
		setIsRegionSelectOpen,
		setSelectedRegions,
		setIncludeAllRegions,
	]);

	const renderAccountDetails = useCallback(
		() => (
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
		),
		[account?.id],
	);

	const modalTitle = (
		<div className="account-settings-modal__title">
			Account settings for{' '}
			<span className="account-settings-modal__title-account-id">
				{account?.id}
			</span>
		</div>
	);

	return (
		<SignozModal
			open={isOpen}
			title={modalTitle}
			onCancel={handleClose}
			onOk={handleSubmit}
			okText="Save"
			okButtonProps={{
				disabled: isSaveDisabled,
				className: 'account-settings-modal__footer-save-button',
				loading: isLoading,
			}}
			cancelButtonProps={{
				className: 'account-settings-modal__footer-close-button',
			}}
			width={672}
			rootClassName="account-settings-modal"
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
					{renderAccountDetails()}

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
						{renderRegionSelector()}
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
		</SignozModal>
	);
}

export default AccountSettingsModal;
