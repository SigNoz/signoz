import { useEffect, useState } from 'react';
import { Button } from '@signozhq/ui/button';
import { Callout } from '@signozhq/ui/callout';
import { ComboboxSimple } from '@signozhq/ui/combobox';
import { DrawerWrapper } from '@signozhq/ui/drawer';
import { Input } from '@signozhq/ui/input';
import { Typography } from '@signozhq/ui/typography';
import { Select } from 'antd';
import { GCP_REGIONS } from 'container/Integrations/constants';
import { IntegrationModalProps } from 'container/Integrations/HeroSection/types';
import { useCloudAccountSetupDrawer } from 'hooks/integration/gcp/useCloudAccountSetupDrawer';
import { Controller, useForm } from 'react-hook-form';
import { popupContainer } from 'utils/selectPopupContainer';

import ConnectionSecretsFields from './ConnectionSecretsFields';
import FlowSelector from './FlowSelector';
import { GcpSetupFormValues, SetupFlow } from './types';

import styles from './CloudAccountSetupDrawer.module.scss';

const REGION_ITEMS = GCP_REGIONS.map((region) => ({
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
				<Callout
					type="error"
					size="small"
					showIcon
					action="dismissible"
					onClick={clearSubmitError}
					title="Failed to connect GCP account"
					testId="gcp-connect-error"
				>
					{submitError}
				</Callout>
			)}
			<div className={styles.footer}>
				<Button
					variant="outlined"
					color="secondary"
					onClick={handleClose}
					testId="gcp-cancel-btn"
				>
					Cancel
				</Button>
				<Button
					variant="solid"
					color="primary"
					onClick={handleSubmit(connectAccount)}
					loading={isLoading}
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
			{/* TODO(gcp): re-enable the setup-guide callout once the GCP guide is live.
				<SetupGuideCallout
					onOpenGuide={(): void =>
						window.open('https://signoz.io/docs/cloud-integrations/gcp/', '_blank')
					}
				/> */}
			<div className={styles.drawerSection}>
				<label htmlFor="gcp-account-name-input">
					Account Name{' '}
					<span className={styles.required} aria-hidden="true">
						*
					</span>
				</label>
				<Controller
					name="accountName"
					control={control}
					rules={{ required: 'Please enter an account name' }}
					render={({ field, fieldState }): JSX.Element => (
						<>
							<Input
								id="gcp-account-name-input"
								className={styles.fullWidth}
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
			<div className={styles.drawerSection}>
				<label htmlFor="gcp-deployment-project-id-input">
					Deployment Project ID{' '}
					<span className={styles.required} aria-hidden="true">
						*
					</span>
				</label>
				<Controller
					name="deploymentProjectId"
					control={control}
					rules={{ required: 'Please enter the deployment project ID' }}
					render={({ field, fieldState }): JSX.Element => (
						<>
							<Input
								id="gcp-deployment-project-id-input"
								className={`${styles.fullWidth} ${styles.mono}`}
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
				<label htmlFor="gcp-deployment-region-select">
					Deployment Region{' '}
					<span className={styles.required} aria-hidden="true">
						*
					</span>
				</label>
				<Controller
					name="deploymentRegion"
					control={control}
					rules={{ required: 'Please select a region' }}
					render={({ field, fieldState }): JSX.Element => (
						<>
							<ComboboxSimple
								id="gcp-deployment-region-select"
								className={styles.fullWidth}
								items={REGION_ITEMS}
								value={field.value}
								onChange={(value): void => field.onChange(value as string)}
								placeholder="Select a region..."
								inputPlaceholder="Search regions…"
								withPortal={false}
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
				<label htmlFor="gcp-project-ids-select">
					Projects to Monitor{' '}
					<span className={styles.required} aria-hidden="true">
						*
					</span>
				</label>
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
								className={`${styles.fullWidth} ${styles.projectIdsSelect}`}
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
