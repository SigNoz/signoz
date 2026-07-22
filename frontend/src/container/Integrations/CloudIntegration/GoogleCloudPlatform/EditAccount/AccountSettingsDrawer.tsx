import { Dispatch, SetStateAction, useMemo } from 'react';
import { useQueryClient } from 'react-query';
import { Save } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { DrawerWrapper } from '@signozhq/ui/drawer';
import { Form, Select } from 'antd';
import { invalidateListAccounts } from 'api/generated/services/cloudintegration';
import { INTEGRATION_TYPES } from 'container/Integrations/constants';
import { CloudAccount } from 'container/Integrations/types';
import { useAccountSettingsDrawer } from 'hooks/integration/gcp/useAccountSettingsDrawer';

import RemoveIntegrationAccount from '../../RemoveAccount/RemoveIntegrationAccount';

import '../../AmazonWebServices/EditAccount/AccountSettingsModal.style.scss';

interface AccountSettingsDrawerProps {
	onClose: () => void;
	account: CloudAccount;
	setActiveAccount: Dispatch<SetStateAction<CloudAccount | null>>;
}

function AccountSettingsDrawer({
	onClose,
	account,
	setActiveAccount,
}: AccountSettingsDrawerProps): JSX.Element {
	const {
		form,
		isLoading,
		projectIds,
		isSaveDisabled,
		setProjectIds,
		handleSubmit,
		handleClose,
	} = useAccountSettingsDrawer({ onClose, account, setActiveAccount });

	const queryClient = useQueryClient();

	const gcpConfig = useMemo(
		() => ('project_ids' in account.config ? account.config : null),
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
								cloudProvider: INTEGRATION_TYPES.GCP,
							});
							setActiveAccount(null);
							handleClose();
						}}
						cloudProvider={INTEGRATION_TYPES.GCP}
					/>
					<Button
						variant="solid"
						color="secondary"
						disabled={isSaveDisabled}
						onClick={handleSubmit}
						loading={isLoading}
						prefix={<Save size={14} />}
						data-testid="gcp-update-account-btn"
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
					projectIds: gcpConfig?.project_ids || [],
				}}
			>
				<div className="account-settings-modal__body">
					<div className="account-settings-modal__body-account-info">
						<div className="account-settings-modal__body-account-info-connected-account-details">
							<div className="account-settings-modal__body-account-info-connected-account-details-title">
								Connected Account details
							</div>
							<div className="account-settings-modal__body-account-info-connected-account-details-account-id">
								Account Name:{' '}
								<span className="account-settings-modal__body-account-info-connected-account-details-account-id-account-id">
									{account?.providerAccountId}
								</span>
							</div>
						</div>
					</div>

					{gcpConfig?.deployment_project_id && (
						<div className="account-settings-modal__body-region-selector">
							<div className="account-settings-modal__body-region-selector-title">
								Deployment project ID
							</div>
							<div className="account-settings-modal__body-region-selector-description">
								{gcpConfig.deployment_project_id}
							</div>
						</div>
					)}

					{gcpConfig?.deployment_region && (
						<div className="account-settings-modal__body-region-selector">
							<div className="account-settings-modal__body-region-selector-title">
								Deployment region
							</div>
							<div className="account-settings-modal__body-region-selector-description">
								{gcpConfig.deployment_region}
							</div>
						</div>
					)}

					<div className="account-settings-modal__body-region-selector">
						<div className="account-settings-modal__body-region-selector-title">
							Projects to monitor
						</div>
						<div className="account-settings-modal__body-region-selector-description">
							Update the GCP project IDs that should be monitored.
						</div>

						<Form.Item
							name="projectIds"
							rules={[
								{
									required: true,
									type: 'array',
									min: 1,
									message: 'Please add at least one project ID',
								},
							]}
						>
							<Select
								mode="tags"
								value={projectIds}
								tokenSeparators={[',']}
								onChange={(values): void => {
									setProjectIds(values);
									form.setFieldValue('projectIds', values);
								}}
								data-testid="gcp-edit-project-ids-select"
							/>
						</Form.Item>
					</div>
				</div>
			</Form>
		</DrawerWrapper>
	);
}

export default AccountSettingsDrawer;
