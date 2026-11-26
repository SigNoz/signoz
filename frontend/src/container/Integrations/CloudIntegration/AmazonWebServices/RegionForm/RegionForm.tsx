import { Form } from 'antd';
import { RegionFormProps } from 'container/Integrations/HeroSection/types';
import { regions } from 'utils/regions';

import AgentSetupCommand from '../../AgentSetupCommand/AgentSetupCommand';
import AlertMessage from '../../AlertMessage';
import {
	ComplianceNote,
	MonitoringRegionsSection,
	RegionDeploymentSection,
} from '../IntegrateNowFormSections';
import RenderConnectionFields from './RenderConnectionParams';

export function RegionForm({
	form,
	modalState,
	selectedRegions,
	onSubmit,
	connectionCommand,
	handleRegionChange,
	connectionParams,
	isConnectionParamsLoading,
	setSelectedRegions,
	setIncludeAllRegions,
}: RegionFormProps): JSX.Element {
	return (
		<Form
			form={form}
			className="cloud-account-setup-form"
			layout="vertical"
			onFinish={onSubmit}
		>
			{connectionCommand ? (
				<AgentSetupCommand
					description="Run this command in AWS CloudShell, or in a terminal where the AWS CLI is signed in to the account you want to monitor. It contains your SigNoz keys, so do not share it."
					command={connectionCommand}
					testId="aws-agent-command"
				/>
			) : (
				<div className="cloud-account-setup-form__content">
					<RegionDeploymentSection
						regions={regions}
						handleRegionChange={handleRegionChange}
					/>
					<MonitoringRegionsSection
						selectedRegions={selectedRegions}
						setSelectedRegions={setSelectedRegions}
						setIncludeAllRegions={setIncludeAllRegions}
					/>
					<ComplianceNote />
					<RenderConnectionFields
						isConnectionParamsLoading={isConnectionParamsLoading}
						connectionParams={connectionParams}
					/>
				</div>
			)}

			<div className="cloud-account-setup-form__alert">
				<AlertMessage modalState={modalState} />
			</div>
		</Form>
	);
}
