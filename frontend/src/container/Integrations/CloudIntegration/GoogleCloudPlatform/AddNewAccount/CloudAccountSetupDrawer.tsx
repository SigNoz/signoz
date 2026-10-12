import { useEffect, useState } from 'react';
import { SolidAlertCircle } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { Callout } from '@signozhq/ui/callout';
import { Combobox } from '@signozhq/ui/combobox';
import type { ComboboxItemType } from '@signozhq/ui/combobox';
import { DrawerWrapper } from '@signozhq/ui/drawer';
import { Input } from '@signozhq/ui/input';
import { Typography } from '@signozhq/ui/typography';
import { Select } from 'antd';
import cx from 'classnames';
import { GCP_REGIONS } from 'container/Integrations/constants';
import { IntegrationModalProps } from 'container/Integrations/HeroSection/types';
import { useCloudAccountSetupDrawer } from 'hooks/integration/gcp/useCloudAccountSetupDrawer';
import { Controller, useForm } from 'react-hook-form';
import { popupContainer } from 'utils/selectPopupContainer';

import ConnectionSecretsFields from './ConnectionSecretsFields';
import FieldLabel from './FieldLabel';
import FlowSelector from './FlowSelector';
import SetupGuideCallout from './SetupGuideCallout';
import { GcpSetupFormValues, SetupFlow } from './types';

import styles from './CloudAccountSetupDrawer.module.scss';

const REGION_ITEMS: ComboboxItemType[] = GCP_REGIONS.map((region) => ({
	type: 'item',
	value: region.value,
	label: `${region.label} (${region.value})`,
}));

const DEFAULT_VALUES: GcpSetupFormValues = {
	accountName: '',
	deploymentProjectId: '',
	deploymentRegion: '',
	projectIds: [],
	sigNozApiUrl: '',
	sigNozApiKey: '',
	ingestionUrl: '',
	ingestionKey: '',
};

function CloudAccountSetupDrawer({
	onClose,
}: IntegrationModalProps): JSX.Element {
	const {
		isLoading,
		connectAccount,
		handleClose,
		connectionParams,
		isConnectionParamsLoading,
		submitError,
		clearSubmitError,
	} = useCloudAccountSetupDrawer({ onClose });

	const { control, handleSubmit, setValue } = useForm<GcpSetupFormValues>({
		defaultValues: DEFAULT_VALUES,
	});

	const [flow, setFlow] = useState<SetupFlow>('manual');

	// Pre-fill the deployment/ingestion fields with the fetched credentials.
	useEffect(() => {
		if (!connectionParams) {
			return;
		}
		setValue('sigNozApiUrl', connectionParams.sigNozApiUrl);
		setValue('sigNozApiKey', connectionParams.sigNozApiKey);
		setValue('ingestionUrl', connectionParams.ingestionUrl);
		setValue('ingestionKey', connectionParams.ingestionKey);
	}, [connectionParams, setValue]);

	const footer = (
		<div className={styles.footerContainer}>
			{submitError && (
				<Callout.Closeable
					color="danger"
					size="sm"
					icon={<SolidAlertCircle />}
					closed={false}
					onClose={clearSubmitError}
					testId="gcp-connect-error"
				>
					Failed to connect GCP account. {submitError}
				</Callout.Closeable>
			)}
			<div className={styles.footer}>
				<Button
					size="md"
					variant="outlined"
					color="secondary"
					onClick={handleClose}
					testId="gcp-cancel-btn"
				>
					Cancel
				</Button>
				<Button
					size="md"
					variant="solid"
					color="primary"
					onClick={handleSubmit(connectAccount)}
					loading={isLoading || isConnectionParamsLoading}
					testId="gcp-connect-account-btn"
				>
					Connect Account
				</Button>
			</div>
		</div>
	);

	return (
		<DrawerWrapper
			open={true}
			className={styles.setupDrawer}
			onOpenChange={(open): void => {
				if (!open) {
					handleClose();
				}
			}}
			direction="right"
			showCloseButton
			title="Connect Google Cloud Platform"
			width="base"
			footer={footer}
			drawerHeaderProps={{ className: styles.title }}
		>
			<FlowSelector value={flow} onChange={setFlow} />
			<SetupGuideCallout />
			<div className={styles.drawerSection}>
				<FieldLabel
					htmlFor="gcp-account-name-input"
					label="Account Name"
					tooltip="A label to identify this group of GCP projects (org ID, billing email, or any descriptive name)"
					required
				/>
				<Controller
					name="accountName"
					control={control}
					rules={{ required: 'Please enter an account name' }}
					render={({ field, fieldState }): JSX.Element => (
						<>
							<Input
								id="gcp-account-name-input"
								placeholder="e.g. my-org or billing@company.com"
								value={field.value}
								onChange={(e): void => field.onChange(e.target.value)}
								testId="gcp-account-name-input"
							/>
							{fieldState.error && (
								<Typography.Text
									as="span"
									size="small"
									role="alert"
									className={styles.fieldError}
								>
									{fieldState.error.message}
								</Typography.Text>
							)}
						</>
					)}
				/>
			</div>
			<div className={cx(styles.drawerSection, styles.monoInput)}>
				<FieldLabel
					htmlFor="gcp-deployment-project-id-input"
					label="Deployment Project ID"
					tooltip="The GCP project that hosts your OTel Collector deployment — often separate from the projects you actually monitor"
					required
				/>
				<Controller
					name="deploymentProjectId"
					control={control}
					rules={{ required: 'Please enter the deployment project ID' }}
					render={({ field, fieldState }): JSX.Element => (
						<>
							<Input
								id="gcp-deployment-project-id-input"
								placeholder="e.g. my-deployment-project-123"
								value={field.value}
								onChange={(e): void => field.onChange(e.target.value)}
								testId="gcp-deployment-project-id-input"
							/>
							{fieldState.error && (
								<Typography.Text
									as="span"
									size="small"
									role="alert"
									className={styles.fieldError}
								>
									{fieldState.error.message}
								</Typography.Text>
							)}
						</>
					)}
				/>
			</div>
			<div className={styles.drawerSection}>
				<FieldLabel
					htmlFor="gcp-deployment-region-select"
					label="Deployment Region"
					tooltip="The GCP region where your OTel Collector will be deployed"
					required
				/>
				<Controller
					name="deploymentRegion"
					control={control}
					rules={{ required: 'Please select a region' }}
					render={({ field, fieldState }): JSX.Element => (
						<>
							<Combobox
								id="gcp-deployment-region-select"
								items={REGION_ITEMS}
								value={field.value || undefined}
								onChange={(value): void => field.onChange(value ?? '')}
								placeholder="Select a region..."
								searchInputProps={{ placeholder: 'Search regions…' }}
								testId="gcp-deployment-region-select"
							/>
							{fieldState.error && (
								<Typography.Text
									as="span"
									size="small"
									role="alert"
									className={styles.fieldError}
								>
									{fieldState.error.message}
								</Typography.Text>
							)}
						</>
					)}
				/>
			</div>
			<div className={styles.drawerSection}>
				<FieldLabel
					htmlFor="gcp-project-ids-select"
					label="Projects to Monitor"
					tooltip="Enter each GCP project ID then press Enter"
					required
				/>
				<Controller
					name="projectIds"
					control={control}
					rules={{
						validate: (value): true | string =>
							value.length > 0 || 'Please add at least one project ID',
					}}
					render={({ field, fieldState }): JSX.Element => (
						<>
							<Select
								id="gcp-project-ids-select"
								className={cx(styles.fullWidth, styles.projectIdsSelect)}
								mode="tags"
								value={field.value}
								onChange={(value): void => field.onChange(value)}
								placeholder="Add project IDs…"
								tokenSeparators={[',', ' ']}
								notFoundContent={null}
								suffixIcon={null}
								getPopupContainer={popupContainer}
								data-testid="gcp-project-ids-select"
							/>
							{fieldState.error && (
								<Typography.Text
									as="span"
									size="small"
									role="alert"
									className={styles.fieldError}
								>
									{fieldState.error.message}
								</Typography.Text>
							)}
						</>
					)}
				/>
			</div>
			<ConnectionSecretsFields
				control={control}
				isLoading={isConnectionParamsLoading}
				connectionParams={connectionParams}
			/>
		</DrawerWrapper>
	);
}

export default CloudAccountSetupDrawer;
