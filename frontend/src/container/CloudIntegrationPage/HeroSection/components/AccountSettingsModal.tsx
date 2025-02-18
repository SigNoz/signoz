import './AccountSettingsModal.style.scss';

import { Form, Select, Switch } from 'antd';
import SignozModal from 'components/SignozModal/SignozModal';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import {
	getRegionPreviewText,
	useAccountSettingsModal,
} from 'hooks/integration/aws/useAccountSettingsModal';
import useUrlQuery from 'hooks/useUrlQuery';
import history from 'lib/history';
import { Dispatch, SetStateAction, useCallback } from 'react';
import { useQueryClient } from 'react-query';

import { CloudAccount } from '../../ServicesSection/types';
import { RegionSelector } from './RegionSelector';
import RemoveIntegrationAccount from './RemoveIntegrationAccount';

interface AccountSettingsModalProps {
	onClose: () => void;
	account: CloudAccount;
	setActiveAccount: Dispatch<SetStateAction<CloudAccount | null>>;
}

function AccountSettingsModal({
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

	const queryClient = useQueryClient();
	const urlQuery = useUrlQuery();

	const handleRemoveIntegrationAccountSuccess = (): void => {
		queryClient.invalidateQueries([REACT_QUERY_KEY.AWS_ACCOUNTS]);
		urlQuery.delete('cloudAccountId');
		handleClose();
		history.replace({ search: urlQuery.toString() });
	};

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
					suffixIcon={null}
					placeholder="Select Region(s)"
					className="cloud-account-setup-form__select account-settings-modal__body-regions-select integrations-select"
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
			open
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
						<RemoveIntegrationAccount
							accountId={account?.id}
							onRemoveIntegrationAccountSuccess={handleRemoveIntegrationAccountSuccess}
						/>
					</div>
				</div>
			</Form>
		</SignozModal>
	);
}

export default AccountSettingsModal;
