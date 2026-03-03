import { Dispatch, SetStateAction, useCallback } from 'react';
import { useQueryClient } from 'react-query';
import { Button } from '@signozhq/button';
import { DrawerWrapper } from '@signozhq/drawer';
import { Form } from 'antd';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useAccountSettingsModal } from 'hooks/integration/aws/useAccountSettingsModal';
import useUrlQuery from 'hooks/useUrlQuery';
import history from 'lib/history';
import { Save } from 'lucide-react';

import logEvent from '../../../../../../api/common/logEvent';
import { CloudAccount } from '../../types';
import { RegionSelector } from './RegionSelector';
import RemoveIntegrationAccount from './RemoveIntegrationAccount';

import './AccountSettingsModal.style.scss';

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
		isSaveDisabled,
		setSelectedRegions,
		setIncludeAllRegions,
		handleSubmit,
		handleClose,
	} = useAccountSettingsModal({ onClose, account, setActiveAccount });

	const queryClient = useQueryClient();
	const urlQuery = useUrlQuery();

	const handleRemoveIntegrationAccountSuccess = useCallback((): void => {
		queryClient.invalidateQueries([REACT_QUERY_KEY.AWS_ACCOUNTS]);
		urlQuery.delete('cloudAccountId');
		handleClose();
		history.replace({ search: urlQuery.toString() });

		logEvent('AWS Integration: Account removed', {
			id: account?.id,
			cloudAccountId: account?.cloud_account_id,
		});
	}, [
		queryClient,
		urlQuery,
		handleClose,
		account?.id,
		account?.cloud_account_id,
	]);

	const renderAccountDetails = useCallback(() => {
		return (
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

					<div className="account-settings-modal__body-region-selector">
						<div className="account-settings-modal__body-region-selector-title">
							Which regions do you want to monitor?
						</div>
						<div className="account-settings-modal__body-region-selector-description">
							Choose only the regions you want SigNoz to monitor.
						</div>

						<RegionSelector
							selectedRegions={selectedRegions}
							setSelectedRegions={setSelectedRegions}
							setIncludeAllRegions={setIncludeAllRegions}
						/>
					</div>
				</div>

				<div className="account-settings-modal__footer">
					<RemoveIntegrationAccount
						accountId={account?.id}
						onRemoveIntegrationAccountSuccess={handleRemoveIntegrationAccountSuccess}
					/>

					<Button
						variant="solid"
						color="secondary"
						disabled={isSaveDisabled}
						onClick={handleSubmit}
						loading={isLoading}
						prefixIcon={<Save size={14} />}
					>
						Update Changes
					</Button>
				</div>
			</Form>
		);
	}, [
		form,
		selectedRegions,
		includeAllRegions,
		account?.id,
		handleRemoveIntegrationAccountSuccess,
		isSaveDisabled,
		handleSubmit,
		isLoading,
		setSelectedRegions,
		setIncludeAllRegions,
	]);

	const handleDrawerOpenChange = useCallback(
		(open: boolean): void => {
			if (!open) {
				handleClose();
			}
		},
		[handleClose],
	);

	return (
		<DrawerWrapper
			open={true}
			type="panel"
			className="account-settings-modal"
			header={{
				title: 'Account Settings',
			}}
			// onCancel={handleClose}
			// onOk={handleSubmit}
			// okText="Save"
			// okButtonProps={{
			// 	disabled: isSaveDisabled,
			// 	className: 'account-settings-modal__footer-save-button',
			// 	loading: isLoading,
			// }}
			// cancelButtonProps={{
			// 	className: 'account-settings-modal__footer-close-button',
			// }}
			direction="right"
			showCloseButton
			content={renderAccountDetails()}
			onOpenChange={handleDrawerOpenChange}
		/>
	);
}

export default AccountSettingsModal;
