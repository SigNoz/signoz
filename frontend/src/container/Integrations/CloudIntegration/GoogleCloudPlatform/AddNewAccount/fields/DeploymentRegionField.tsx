import { ComboboxSimple } from '@signozhq/ui/combobox';
import { CloudintegrationtypesGCPConnectionMethodDTO } from 'api/generated/services/sigNoz.schemas';
import cx from 'classnames';
import { GCP_REGIONS } from 'container/Integrations/constants';
import { Control, Controller } from 'react-hook-form';

import FormField from '../FormField';
import { GcpSetupFormValues } from '../types';

import styles from './Fields.module.scss';

const TOOLTIPS: Record<CloudintegrationtypesGCPConnectionMethodDTO, string> = {
	[CloudintegrationtypesGCPConnectionMethodDTO.manual]:
		'The GCP region where your OTel Collector will be deployed',
	[CloudintegrationtypesGCPConnectionMethodDTO.agent]:
		'The GCP region where the agent resources are deployed',
};

const REGION_ITEMS = GCP_REGIONS.map((region) => ({
	value: region.value,
	label: `${region.label} (${region.value})`,
}));

interface DeploymentRegionFieldProps {
	control: Control<GcpSetupFormValues>;
	connectionMethod: CloudintegrationtypesGCPConnectionMethodDTO;
}

function DeploymentRegionField({
	control,
	connectionMethod,
}: DeploymentRegionFieldProps): JSX.Element {
	return (
		<Controller
			name="deploymentRegion"
			control={control}
			rules={{ required: 'Please select a region' }}
			render={({ field, fieldState }): JSX.Element => (
				<FormField
					htmlFor="gcp-deployment-region-select"
					label="Deployment Region"
					tooltip={TOOLTIPS[connectionMethod]}
					required
					error={fieldState.error}
				>
					<ComboboxSimple
						id="gcp-deployment-region-select"
						className={cx(styles.fullWidth, styles.regionSelect, {
							[styles.regionEmpty]: !field.value,
						})}
						items={REGION_ITEMS}
						value={field.value}
						onChange={(value): void => field.onChange(value as string)}
						placeholder="Select a region..."
						inputPlaceholder="Search regions…"
						withPortal={false}
						testId="gcp-deployment-region-select"
					/>
				</FormField>
			)}
		/>
	);
}

export default DeploymentRegionField;
