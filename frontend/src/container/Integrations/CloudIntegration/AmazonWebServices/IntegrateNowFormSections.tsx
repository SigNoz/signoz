import { Dispatch, SetStateAction, useMemo } from 'react';
import { Form } from 'antd';
import { SelectSimple, SelectSimpleItem } from '@signozhq/ui/select';
import { Region } from 'utils/regions';

import { RegionSelector } from './RegionForm/RegionSelector';

// Form section components
function RegionDeploymentSection({
	regions,
	handleRegionChange,
	isFormDisabled,
}: {
	regions: Region[];
	handleRegionChange: (value: string) => void;
	isFormDisabled: boolean;
}): JSX.Element {
	const regionItems = useMemo<SelectSimpleItem[]>(
		() =>
			regions.flatMap((region) =>
				region.subRegions.map((subRegion) => ({
					value: subRegion.id,
					label: subRegion.displayName,
				})),
			),
		[regions],
	);

	return (
		<div className="cloud-account-setup-form__form-group">
			<div className="cloud-account-setup-form__title">
				Where should we deploy the SigNoz Cloud stack?
			</div>
			<div className="cloud-account-setup-form__description">
				Choose the AWS region for CloudFormation stack deployment
			</div>
			<Form.Item
				name="region"
				rules={[{ required: true, message: 'Please select a region' }]}
				className="cloud-account-setup-form__form-item"
			>
				<SelectSimple
					placeholder="e.g. US East (N. Virginia)"
					className="cloud-account-setup-form__select integrations-select"
					onChange={(value): void => handleRegionChange(value as string)}
					disabled={isFormDisabled}
					items={regionItems}
				/>
			</Form.Item>
		</div>
	);
}

function MonitoringRegionsSection({
	selectedRegions,
	setSelectedRegions,
	setIncludeAllRegions,
}: {
	selectedRegions: string[];
	setSelectedRegions: Dispatch<SetStateAction<string[]>>;
	setIncludeAllRegions: Dispatch<SetStateAction<boolean>>;
}): JSX.Element {
	return (
		<div className="cloud-account-setup-form__form-group">
			<div className="cloud-account-setup-form__title">
				Which regions do you want to monitor?
			</div>
			<div className="cloud-account-setup-form__description">
				Choose only the regions you want SigNoz to monitor. You can enable all at
				once, or pick specific ones:
			</div>

			<RegionSelector
				selectedRegions={selectedRegions}
				setSelectedRegions={setSelectedRegions}
				setIncludeAllRegions={setIncludeAllRegions}
			/>
		</div>
	);
}

function ComplianceNote(): JSX.Element {
	return (
		<div className="cloud-account-setup-form__form-group">
			<div className="cloud-account-setup-form__note">
				Note: Some organizations may require the CloudFormation stack to be deployed
				in the same region as their primary infrastructure for compliance or latency
				reasons.
			</div>
		</div>
	);
}

export { ComplianceNote, MonitoringRegionsSection, RegionDeploymentSection };
