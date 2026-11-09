import { Dispatch, SetStateAction, useCallback } from 'react';
import { useQueryClient } from 'react-query';
import { Button } from '@signozhq/ui/button';
import { Drawer } from '@signozhq/ui/drawer';
import { Form } from 'antd';
import { invalidateListAccounts } from 'api/generated/services/cloudintegration';
import { INTEGRATION_TYPES } from 'container/Integrations/constants';
import { useAccountSettingsModal } from 'hooks/integration/aws/useAccountSettingsModal';
import useUrlQuery from 'hooks/useUrlQuery';
import { navigate } from 'lib/router/navigation';
import { Save } from '@signozhq/icons';

import logEvent from '../../../../../api/common/logEvent';
import RemoveIntegrationAccount from '../../RemoveAccount/RemoveIntegrationAccount';
import { RegionSelector } from '../RegionForm/RegionSelector';
import { CloudAccount } from '../types';

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
		void invalidateListAccounts(queryClient, {
			cloudProvider: INTEGRATION_TYPES.AWS,
		});
		urlQuery.delete('cloudAccountId');
		setActiveAccount(null);
		handleClose();
		navigate({ search: urlQuery.toString() }, { replace: true });

		logEvent('AWS Integration: Account removed', {
			id: account?.id,
			cloudAccountId: account?.cloud_account_id,
		});
	}, [
		queryClient,
		urlQuery,
		setActiveAccount,
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
									{account?.providerAccountId}
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
			</Form>
		);
	}, [
		form,
		selectedRegions,
		includeAllRegions,
		account?.providerAccountId,
		setSelectedRegions,
		setIncludeAllRegions,
	]);

	const footerPrefix = (
		<RemoveIntegrationAccount
			accountId={account?.id}
			onRemoveIntegrationAccountSuccess={handleRemoveIntegrationAccountSuccess}
			cloudProvider={INTEGRATION_TYPES.AWS}
		/>
	);

	const footerSuffix = (
		<Button
			disabledTooltip={
				selectedRegions.length === 0
					? 'Select at least one region'
					: 'Change the regions first'
			}
			size="md"
			variant="solid"
			color="secondary"
			disabled={isSaveDisabled}
			onClick={handleSubmit}
			loading={isLoading}
			prefix={<Save size={14} />}
			testId="aws-update-account-btn"
		>
			Update Changes
		</Button>
	);

	return (
		<Drawer
			type="task"
			open
			onClose={handleClose}
			title="Account Settings"
			width="wide"
			footerPrefix={footerPrefix}
			footerSuffix={footerSuffix}
		>
			{renderAccountDetails()}
		</Drawer>
	);
}

export default AccountSettingsModal;
