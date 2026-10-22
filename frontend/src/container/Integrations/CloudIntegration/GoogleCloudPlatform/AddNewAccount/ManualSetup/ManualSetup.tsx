import { Button } from '@signozhq/ui/button';
import { Input } from '@signozhq/ui/input';
import { Typography } from '@signozhq/ui/typography';
import { CloudintegrationtypesGCPConnectionMethodDTO } from 'api/generated/services/sigNoz.schemas';
import { useManualAccountSetup } from 'hooks/integration/gcp/useManualAccountSetup';
import { Controller, useForm } from 'react-hook-form';

import ProjectIdsInput from '../../ProjectIdsInput';
import ConnectionSecretsFields from '../ConnectionSecretsFields';
import FieldLabel from '../FieldLabel';
import DeploymentProjectIdField from '../fields/DeploymentProjectIdField';
import DeploymentRegionField from '../fields/DeploymentRegionField';
import ConnectionMethodSelector from '../ConnectionMethodSelector';
import SetupDrawerFooter from '../SetupDrawerFooter';
import SetupGuideCallout from '../SetupGuideCallout';
import { MANUAL_SETUP_GUIDE, DEFAULT_SETUP_FORM_VALUES } from '../constants';
import { GcpSetupFormValues } from '../types';
import { usePrefillCredentials } from '../usePrefillCredentials';

import styles from './ManualSetup.module.scss';

interface ManualSetupProps {
	footerSlot: HTMLDivElement | null;
	onConnectionMethodChange: (
		connectionMethod: CloudintegrationtypesGCPConnectionMethodDTO,
	) => void;
	onClose: () => void;
}

function ManualSetup({
	footerSlot,
	onConnectionMethodChange,
	onClose,
}: ManualSetupProps): JSX.Element {
	const {
		isLoading,
		connectAccount,
		handleClose,
		connectionParams,
		isConnectionParamsLoading,
		submitError,
		clearSubmitError,
	} = useManualAccountSetup({ onClose });

	const { control, handleSubmit, setValue } = useForm<GcpSetupFormValues>({
		defaultValues: DEFAULT_SETUP_FORM_VALUES,
	});

	usePrefillCredentials(connectionParams, setValue);

	return (
		<>
			<ConnectionMethodSelector
				value={CloudintegrationtypesGCPConnectionMethodDTO.manual}
				onChange={onConnectionMethodChange}
				disabled={isLoading}
			/>
			<SetupGuideCallout {...MANUAL_SETUP_GUIDE} />
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
			<DeploymentProjectIdField
				control={control}
				connectionMethod={CloudintegrationtypesGCPConnectionMethodDTO.manual}
			/>
			<DeploymentRegionField
				control={control}
				connectionMethod={CloudintegrationtypesGCPConnectionMethodDTO.manual}
			/>
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
							<ProjectIdsInput
								id="gcp-project-ids-select"
								testId="gcp-project-ids-select"
								value={field.value}
								onChange={field.onChange}
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
			<SetupDrawerFooter
				slot={footerSlot}
				errorTitle="Failed to connect GCP account"
				error={submitError}
				onDismissError={clearSubmitError}
				onCancel={handleClose}
			>
				<Button
					variant="solid"
					color="primary"
					onClick={handleSubmit(connectAccount)}
					loading={isLoading}
					disabled={isConnectionParamsLoading}
					testId="gcp-connect-account-btn"
				>
					Connect Account
				</Button>
			</SetupDrawerFooter>
		</>
	);
}

export default ManualSetup;
