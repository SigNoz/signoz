import { Combobox } from '@signozhq/ui/combobox';
import type { ComboboxItemType } from '@signozhq/ui/combobox';
import { CloudintegrationtypesGCPConnectionMethodDTO } from 'api/generated/services/sigNoz.schemas';
import { GCP_REGIONS } from 'container/Integrations/constants';
import { Control, Controller } from 'react-hook-form';

import FormField from '../FormField';
import { GcpSetupFormValues } from '../types';

const TOOLTIPS: Record<CloudintegrationtypesGCPConnectionMethodDTO, string> = {
	[CloudintegrationtypesGCPConnectionMethodDTO.manual]:
		'The GCP region where your OTel Collector will be deployed',
	[CloudintegrationtypesGCPConnectionMethodDTO.agent]:
		'The GCP region where the agent resources are deployed',
};

const REGION_ITEMS: ComboboxItemType[] = GCP_REGIONS.map((region) => ({
	type: 'item',
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
					<Combobox
						id="gcp-deployment-region-select"
						items={REGION_ITEMS}
						value={field.value || undefined}
						onChange={(value): void => field.onChange(value ?? '')}
						placeholder="Select a region..."
						searchInputProps={{ placeholder: 'Search regions…' }}
						testId="gcp-deployment-region-select"
					/>
				</FormField>
			)}
		/>
	);
}

export default DeploymentRegionField;
