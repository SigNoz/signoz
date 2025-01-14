import { Color } from '@signozhq/design-tokens';
import { Form, Select, Switch } from 'antd';
import { ChevronDown } from 'lucide-react';
import { Region } from 'types/regions';

// Form section components
function RegionDeploymentSection({
	regions,
}: {
	regions: Region[];
}): JSX.Element {
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
				<Select
					placeholder="US East (N. Virginia)"
					suffixIcon={<ChevronDown size={16} color={Color.BG_VANILLA_400} />}
					style={{ height: '44px' }}
					className="cloud-account-setup-form__select"
				>
					{regions.flatMap((region) =>
						region.subRegions.map((subRegion) => (
							<Select.Option key={subRegion.id} value={subRegion.id}>
								{subRegion.displayName}
							</Select.Option>
						)),
					)}
				</Select>
			</Form.Item>
		</div>
	);
}

function MonitoringRegionsSection({
	includeAllRegions,
	selectedRegions,
	onIncludeAllRegionsChange,
	getRegionPreviewText,
	onRegionSelect,
}: {
	includeAllRegions: boolean;
	selectedRegions: string[];
	onIncludeAllRegionsChange: (checked: boolean) => void;
	getRegionPreviewText: (regions: string[]) => string[];
	onRegionSelect: () => void;
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
			<Form.Item
				name="monitorRegions"
				rules={[
					{
						validator: async (): Promise<void> => {
							if (selectedRegions.length === 0) {
								throw new Error('Please select at least one region to monitor');
							}
						},
						message: 'Please select at least one region to monitor',
					},
				]}
				className="cloud-account-setup-form__form-item"
			>
				<div className="cloud-account-setup-form__include-all-regions-switch">
					<Switch
						size="small"
						checked={includeAllRegions}
						onChange={onIncludeAllRegionsChange}
					/>
					<button
						className="cloud-account-setup-form__include-all-regions-switch-label"
						type="button"
						onClick={(): void => onIncludeAllRegionsChange(!includeAllRegions)}
					>
						Include all regions
					</button>
				</div>
				<Select
					style={{ height: '44px' }}
					suffixIcon={null}
					placeholder="Select Region(s)"
					className="cloud-account-setup-form__select monitor-regions"
					onClick={onRegionSelect}
					mode="multiple"
					maxTagCount={3}
					value={getRegionPreviewText(selectedRegions)}
					disabled
				/>
			</Form.Item>
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
