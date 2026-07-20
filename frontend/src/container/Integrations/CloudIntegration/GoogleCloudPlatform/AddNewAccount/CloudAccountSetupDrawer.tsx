import { useEffect, useState } from 'react';
import { Info } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { DrawerWrapper } from '@signozhq/ui/drawer';
import { Form, Input, Select } from 'antd';
import cx from 'classnames';
import { GCP_REGIONS } from 'container/Integrations/constants';
import { IntegrationModalProps } from 'container/Integrations/HeroSection/types';
import { popupContainer } from 'utils/selectPopupContainer';

import { useIntegrationModal } from '../../../../../hooks/integration/gcp/useIntegrationModal';
import ConnectionSecretsFields from './ConnectionSecretsFields';
import FlowSelector, { SetupFlow } from './FlowSelector';
import SetupGuideCallout from './SetupGuideCallout';

// Reuse the shared drawer skeleton: fixed header/footer + scrollable body.
import '../../AmazonWebServices/AddNewAccount/CloudAccountSetupModal.style.scss';
import styles from './CloudAccountSetupDrawer.module.scss';

// TODO(gcp): point to the published GCP manual-setup guide once available.
const GCP_MANUAL_SETUP_DOCS_URL =
	'https://signoz.io/docs/cloud-integrations/gcp/';

const infoIcon = <Info size={13} />;

// TODO(gcp): confirm final tooltip copy against the design artifact.
const TOOLTIPS = {
	accountName:
		'A label to identify this group of GCP projects (org ID, billing email, or any descriptive name).',
	deploymentProjectId: 'The GCP project where your OTel Collector will run.',
	deploymentRegion: 'The GCP region where your OTel Collector will be deployed',
	projectIds: 'Enter each GCP project ID then press Enter.',
};

function CloudAccountSetupDrawer({
	onClose,
}: IntegrationModalProps): JSX.Element {
	const {
		form,
		isLoading,
		handleSubmit,
		handleClose,
		connectionParams,
		isConnectionParamsLoading,
	} = useIntegrationModal({ onClose });

	const [selectedFlow, setSelectedFlow] = useState<SetupFlow>('manual');

	// Pre-fill the always-visible deployment/ingestion fields with the fetched
	// credentials. Enterprise users may still have blanks to fill in manually.
	useEffect(() => {
		if (!connectionParams) {
			return;
		}
		form.setFieldsValue({
			sigNozApiUrl: connectionParams.sigNozApiUrl,
			sigNozApiKey: connectionParams.sigNozApiKey,
			ingestionUrl: connectionParams.ingestionUrl,
			ingestionKey: connectionParams.ingestionKey,
		});
	}, [connectionParams, form]);

	const footer = (
		<Button
			variant="solid"
			color="primary"
			onClick={handleSubmit}
			loading={isLoading}
			className={styles.connectButton}
			data-testid="gcp-connect-account-btn"
		>
			Connect Account
		</Button>
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
			title="Connect Google Cloud Platform"
			width="wide"
			footer={footer}
		>
			<div className={cx('cloud-account-setup-modal__content', styles.content)}>
				<FlowSelector value={selectedFlow} onChange={setSelectedFlow} />

				<SetupGuideCallout
					onOpenGuide={(): void => {
						// oxlint-disable-next-line signoz/no-raw-absolute-path -- external docs URL, not an internal path
						window.open(GCP_MANUAL_SETUP_DOCS_URL, '_blank');
					}}
				/>

				<Form
					form={form}
					className={styles.form}
					layout="vertical"
					requiredMark={false}
					initialValues={{ projectIds: [] }}
				>
					<Form.Item
						name="accountName"
						label="Account Name"
						tooltip={{ title: TOOLTIPS.accountName, icon: infoIcon }}
						rules={[{ required: true, message: 'Please enter an account name' }]}
						className={styles.formItem}
					>
						<Input
							size="large"
							placeholder="e.g. my-org or billing@company.com"
							data-testid="gcp-account-name-input"
						/>
					</Form.Item>

					<Form.Item
						name="deploymentProjectId"
						label="Deployment Project ID"
						tooltip={{ title: TOOLTIPS.deploymentProjectId, icon: infoIcon }}
						rules={[
							{ required: true, message: 'Please enter the deployment project ID' },
						]}
						className={styles.formItem}
					>
						<Input
							size="large"
							className={styles.monoInput}
							placeholder="e.g. my-deployment-project-123"
							data-testid="gcp-deployment-project-id-input"
						/>
					</Form.Item>

					<Form.Item
						name="deploymentRegion"
						label="Deployment Region"
						tooltip={{ title: TOOLTIPS.deploymentRegion, icon: infoIcon }}
						rules={[{ required: true, message: 'Please select a region' }]}
						className={styles.formItem}
					>
						<Select
							size="large"
							placeholder="Select a region..."
							showSearch
							optionFilterProp="label"
							options={GCP_REGIONS.map((region) => ({
								label: `${region.label} (${region.value})`,
								value: region.value,
							}))}
							getPopupContainer={popupContainer}
							data-testid="gcp-deployment-region-select"
						/>
					</Form.Item>

					<Form.Item
						name="projectIds"
						label="Projects to Monitor"
						tooltip={{ title: TOOLTIPS.projectIds, icon: infoIcon }}
						rules={[
							{
								required: true,
								type: 'array',
								min: 1,
								message: 'Please add at least one project ID',
							},
						]}
						className={styles.formItem}
					>
						<Select
							size="large"
							mode="tags"
							placeholder="Add project IDs…"
							tokenSeparators={[',']}
							getPopupContainer={popupContainer}
							data-testid="gcp-project-ids-select"
						/>
					</Form.Item>

					<div className={styles.divider} />

					<ConnectionSecretsFields
						isLoading={isConnectionParamsLoading}
						connectionParams={connectionParams}
					/>
				</Form>
			</div>
		</DrawerWrapper>
	);
}

export default CloudAccountSetupDrawer;
