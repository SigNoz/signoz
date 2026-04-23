import { Dispatch, SetStateAction, useMemo } from 'react';
import { useQueryClient } from 'react-query';
import { Button, DrawerWrapper } from '@signozhq/ui';
import { Form, Select } from 'antd';
import { invalidateListAccounts } from 'api/generated/services/cloudintegration';
import { INTEGRATION_TYPES } from 'container/Integrations/constants';
import { CloudAccount } from 'container/Integrations/types';
import { Save } from 'lucide-react';

import { useAccountSettingsModal } from '../../../../../hooks/integration/azure/useAccountSettingsModal';
import RemoveIntegrationAccount from '../../RemoveAccount/RemoveIntegrationAccount';

import '../../AmazonWebServices/EditAccount/AccountSettingsModal.style.scss';

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
		resourceGroups,
		isSaveDisabled,
		setResourceGroups,
		handleSubmit,
		handleClose,
	} = useAccountSettingsModal({ onClose, account, setActiveAccount });

	const queryClient = useQueryClient();

	const azureConfig = useMemo(
		() => ('deployment_region' in account.config ? account.config : null),
		[account.config],
	);

	return (
		<DrawerWrapper
			open={true}
			className="account-settings-modal"
			title="Account Settings"
			direction="right"
			showCloseButton
			onOpenChange={(open): void => {
				if (!open) {
					handleClose();
				}
			}}
			width="wide"
			footer={
				<div className="account-settings-modal__footer">
					<RemoveIntegrationAccount
						accountId={account?.id}
						onRemoveIntegrationAccountSuccess={(): void => {
							void invalidateListAccounts(queryClient, {
								cloudProvider: INTEGRATION_TYPES.AZURE,
							});
							setActiveAccount(null);
							handleClose();
						}}
					/>
					<Button
						variant="solid"
						color="secondary"
						disabled={isSaveDisabled}
						onClick={handleSubmit}
						loading={isLoading}
						prefix={<Save size={14} />}
					>
						Update Changes
					</Button>
				</div>
			}
		>
			<Form
				form={form}
				layout="vertical"
				initialValues={{
					resourceGroups: azureConfig?.resource_groups || [],
				}}
			>
				<div className="account-settings-modal__body">
					<div className="account-settings-modal__body-account-info">
						<div className="account-settings-modal__body-account-info-connected-account-details">
							<div className="account-settings-modal__body-account-info-connected-account-details-title">
								Connected Account details
							</div>
							<div className="account-settings-modal__body-account-info-connected-account-details-account-id">
								Azure Account:{' '}
								<span className="account-settings-modal__body-account-info-connected-account-details-account-id-account-id">
									{account?.providerAccountId}
								</span>
							</div>
						</div>
					</div>

					{azureConfig?.deployment_region && (
						<div className="account-settings-modal__body-region-selector">
							<div className="account-settings-modal__body-region-selector-title">
								Deployment region
							</div>
							<div className="account-settings-modal__body-region-selector-description">
								{azureConfig.deployment_region}
							</div>
						</div>
					)}

					<div className="account-settings-modal__body-region-selector">
						<div className="account-settings-modal__body-region-selector-title">
							Resource groups
						</div>
						<div className="account-settings-modal__body-region-selector-description">
							Update the resource groups that should be monitored.
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
						>
							<Select
								mode="tags"
								value={resourceGroups}
								onChange={(values): void => {
									setResourceGroups(values);
									form.setFieldValue('resourceGroups', values);
								}}
							/>
						</Form.Item>
					</div>
				</div>
			</Form>
		</DrawerWrapper>
	);
}

export default AccountSettingsModal;
