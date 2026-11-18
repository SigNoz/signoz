import { Input } from '@signozhq/ui/input';
import { CloudintegrationtypesGCPConnectionMethodDTO } from 'api/generated/services/sigNoz.schemas';
import cx from 'classnames';
import { Control, Controller } from 'react-hook-form';

import FormField from '../FormField';
import { GcpSetupFormValues } from '../types';

import styles from './Fields.module.scss';

const TOOLTIPS: Record<CloudintegrationtypesGCPConnectionMethodDTO, string> = {
	[CloudintegrationtypesGCPConnectionMethodDTO.manual]:
		'The GCP project that hosts your OTel Collector deployment, often separate from the projects you actually monitor',
	[CloudintegrationtypesGCPConnectionMethodDTO.agent]:
		'The GCP project where SigNoz deploys the agent. The agent monitors this project.',
};

interface DeploymentProjectIdFieldProps {
	control: Control<GcpSetupFormValues>;
	connectionMethod: CloudintegrationtypesGCPConnectionMethodDTO;
}

function DeploymentProjectIdField({
	control,
	connectionMethod,
}: DeploymentProjectIdFieldProps): JSX.Element {
	return (
		<Controller
			name="deploymentProjectId"
			control={control}
			rules={{ required: 'Please enter the deployment project ID' }}
			render={({ field, fieldState }): JSX.Element => (
				<FormField
					htmlFor="gcp-deployment-project-id-input"
					label="Deployment Project ID"
					tooltip={TOOLTIPS[connectionMethod]}
					required
					error={fieldState.error}
				>
					<Input
						id="gcp-deployment-project-id-input"
						className={cx(styles.fullWidth, styles.mono)}
						placeholder="e.g. my-deployment-project-123"
						value={field.value}
						onChange={(e): void => field.onChange(e.target.value)}
						testId="gcp-deployment-project-id-input"
					/>
				</FormField>
			)}
		/>
	);
}

export default DeploymentProjectIdField;
