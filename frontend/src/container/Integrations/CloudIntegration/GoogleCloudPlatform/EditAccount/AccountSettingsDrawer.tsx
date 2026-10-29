import { Dispatch, SetStateAction, useMemo } from 'react';
import { useQueryClient } from 'react-query';
import { Save } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { DrawerWrapper } from '@signozhq/ui/drawer';
import { Form } from 'antd';
import { invalidateListAccounts } from 'api/generated/services/cloudintegration';
import { CloudintegrationtypesGCPConnectionMethodDTO } from 'api/generated/services/sigNoz.schemas';
import { INTEGRATION_TYPES } from 'container/Integrations/constants';
import { CloudAccount } from 'container/Integrations/types';
import { useAccountSettingsDrawer } from 'hooks/integration/gcp/useAccountSettingsDrawer';

import RemoveIntegrationAccount from '../../RemoveAccount/RemoveIntegrationAccount';
import ProjectIdsInput from '../ProjectIdsInput';

import styles from './AccountSettingsDrawer.module.scss';

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
	// The backend rejects updates to agent accounts, so their settings are read-only.
	const isAgentAccount =
		gcpConfig?.connection_method ===
		CloudintegrationtypesGCPConnectionMethodDTO.agent;

	return (
		<DrawerWrapper
			open={true}
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
				<div className={styles.footer}>
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
						gcpConnectionMethod={gcpConfig?.connection_method}
					/>
					{!isAgentAccount && (
						<Button
							disabledTooltip="Change the project IDs first"
							size="md"
							variant="solid"
							color="secondary"
							disabled={isSaveDisabled}
							onClick={handleSubmit}
							loading={isLoading}
							prefix={<Save size={14} />}
							testId="gcp-update-account-btn"
						>
							Update Changes
						</Button>
					)}
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
				<div className={styles.body}>
					<div className={styles.connectedAccountDetails}>
						<div className={styles.connectedAccountDetailsTitle}>
							Connected Account details
						</div>
						<div className={styles.accountId}>
							Account Name:{' '}
							<span className={styles.accountIdValue}>
								{account?.providerAccountId}
							</span>
						</div>
					</div>

					{gcpConfig?.deployment_project_id && (
						<div className={styles.regionSelector}>
							<div className={styles.regionSelectorTitle}>Deployment project ID</div>
							<div className={styles.regionSelectorDescription}>
								{gcpConfig.deployment_project_id}
							</div>
						</div>
					)}

					{gcpConfig?.deployment_region && (
						<div className={styles.regionSelector}>
							<div className={styles.regionSelectorTitle}>Deployment region</div>
							<div className={styles.regionSelectorDescription}>
								{gcpConfig.deployment_region}
							</div>
						</div>
					)}

					<div className={styles.regionSelector}>
						<div className={styles.regionSelectorTitle}>Projects to monitor</div>
						{isAgentAccount ? (
							<div
								className={styles.regionSelectorDescription}
								data-testid="gcp-agent-monitored-projects"
							>
								{gcpConfig?.project_ids.join(', ')}
							</div>
						) : (
							<>
								<div className={styles.regionSelectorDescription}>
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
									<ProjectIdsInput
										id="gcp-edit-project-ids-select"
										testId="gcp-edit-project-ids-select"
										value={projectIds}
										onChange={(values): void => {
											setProjectIds(values);
											form.setFieldValue('projectIds', values);
										}}
									/>
								</Form.Item>
							</>
						)}
					</div>
				</div>
			</Form>
		</DrawerWrapper>
	);
}

export default AccountSettingsDrawer;
