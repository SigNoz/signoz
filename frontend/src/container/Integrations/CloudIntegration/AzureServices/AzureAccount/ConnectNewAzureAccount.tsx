import { useEffect, useMemo, useRef, useState } from 'react';
import { Callout } from '@signozhq/callout';
import { toast } from '@signozhq/sonner';
import Tabs from '@signozhq/tabs';
import { Steps } from 'antd';
import { StepsProps } from 'antd/lib';
import logEvent from 'api/common/logEvent';
import { getAzureDeploymentCommands } from 'api/integration';
import { CodeBlock } from 'components/CodeBlock';
import { INTEGRATION_TYPES } from 'container/Integrations/constants';
import { useGetAccountStatus } from 'hooks/integration/useGetAccountStatus';
import { ChevronDown, ChevronRight } from 'lucide-react';
import {
	AccountStatusResponse,
	ConnectionParams,
	IAzureDeploymentCommands,
} from 'types/api/integrations/types';

import { AzureAccountForm } from './AzureAccountForm';

import './AzureAccount.styles.scss';

interface ConnectNewAzureAccountProps {
	connectionParams: ConnectionParams;
	isConnectionParamsLoading: boolean;
	onAccountConnected: () => void;
}

const PrerequisitesStep = (): JSX.Element => {
	const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false);

	const handleHowItWorksClick = (): void => {
		setIsHowItWorksOpen(!isHowItWorksOpen);
	};

	return (
		<div className="azure-account-prerequisites-step">
			<div className="azure-account-prerequisites-step-description">
				<div className="azure-account-prerequisites-step-description-item">
					<span className="azure-account-prerequisites-step-description-item-bullet">
						—
					</span>{' '}
					Ensure that you’re logged in to the Azure portal or Azure CLI is setup for
					your subscription
				</div>
				<div className="azure-account-prerequisites-step-description-item">
					<span className="azure-account-prerequisites-step-description-item-bullet">
						—
					</span>{' '}
					Ensure that you either have the OWNER role OR
				</div>
				<div className="azure-account-prerequisites-step-description-item">
					<span className="azure-account-prerequisites-step-description-item-bullet">
						—
					</span>{' '}
					Both the CONTRIBUTOR and USER ACCESS ADMIN roles.
				</div>
			</div>

			<div className="azure-account-prerequisites-step-how-it-works">
				<div
					className="azure-account-prerequisites-step-how-it-works-title"
					onClick={handleHowItWorksClick}
				>
					<div className="azure-account-prerequisites-step-how-it-works-title-icon">
						{isHowItWorksOpen ? (
							<ChevronDown size={16} />
						) : (
							<ChevronRight size={16} />
						)}
					</div>
					<div className="azure-account-prerequisites-step-how-it-works-title-text">
						How it works
					</div>
				</div>
				{isHowItWorksOpen && (
					<div className="azure-account-prerequisites-step-how-it-works-description">
						<p>
							SigNoz will create new resource-group to manage the resources required
							for this integration. The following steps will create a User-Assigned
							Managed Identity with the necessary permissions and follows the Principle
							of Least Privilege.
						</p>
						<p>
							Once the Integration template is deployed, you can enable the services
							you want to monitor right here in SigNoz dashboard.
						</p>
					</div>
				)}
			</div>
		</div>
	);
};

const ConnectionSuccess = {
	type: 'success' as const,
	title: 'Agent has been deployed successfully.',
	description: 'You can now safely close this panel.',
};

const ConnectionWarning = {
	type: 'warning' as const,
	title: 'Listening for data...',
	description:
		'Do not close this panel until the agent stack is deployed successfully.',
};

export const ConfigureAgentStep = ({
	connectionParams,
	isConnectionParamsLoading,
	setDeploymentCommands,
	setAccountId,
}: {
	connectionParams: ConnectionParams;
	isConnectionParamsLoading: boolean;
	setDeploymentCommands: (deploymentCommands: IAzureDeploymentCommands) => void;
	setAccountId: (accountId: string) => void;
}): JSX.Element => {
	const [isFetchingDeploymentCommand, setIsFetchingDeploymentCommand] = useState(
		false,
	);

	const getDeploymentCommand = async ({
		primaryRegion,
		resourceGroups,
	}: {
		primaryRegion: string;
		resourceGroups: string[];
	}): Promise<IAzureDeploymentCommands> => {
		setIsFetchingDeploymentCommand(true);

		return await getAzureDeploymentCommands({
			agent_config: connectionParams,
			account_config: {
				deployment_region: primaryRegion,
				resource_groups: resourceGroups,
			},
		});
	};

	const handleFetchDeploymentCommand = async ({
		primaryRegion,
		resourceGroups,
	}: {
		primaryRegion: string;
		resourceGroups: string[];
	}): Promise<void> => {
		const deploymentCommands = await getDeploymentCommand({
			primaryRegion,
			resourceGroups,
		});

		setDeploymentCommands(deploymentCommands);
		if (deploymentCommands.account_id) {
			setAccountId(deploymentCommands.account_id);
		}
		setIsFetchingDeploymentCommand(false);
	};

	return (
		<div className="azure-account-configure-agent-step">
			<AzureAccountForm
				selectedAccount={null}
				connectionParams={connectionParams}
				isConnectionParamsLoading={isConnectionParamsLoading}
				onSubmit={handleFetchDeploymentCommand}
				isLoading={isFetchingDeploymentCommand}
			/>
		</div>
	);
};

const DeployAgentStep = ({
	deploymentCommands,
	accountId,
	onAccountConnected,
}: {
	deploymentCommands: IAzureDeploymentCommands | null;
	accountId: string | null;
	onAccountConnected: () => void;
}): JSX.Element => {
	const [showConnectionStatus, setShowConnectionStatus] = useState(false);
	const [isAccountConnected, setIsAccountConnected] = useState(false);

	const COMMAND_PLACEHOLDER =
		'// Select Primary Region and Resource Groups to fetch the deployment commands\n';

	const handleCopyDeploymentCommand = (): void => {
		setShowConnectionStatus(true);
	};

	const startTimeRef = useRef(Date.now());
	const refetchInterval = 10 * 1000;
	const errorTimeout = 10 * 60 * 1000;

	useGetAccountStatus(INTEGRATION_TYPES.AZURE, accountId ?? undefined, {
		refetchInterval,
		enabled: !!accountId,
		onSuccess: (data: AccountStatusResponse) => {
			if (data.data.status.integration.last_heartbeat_ts_ms !== null) {
				setIsAccountConnected(true);
				setShowConnectionStatus(true);
				onAccountConnected();

				// setModalState(ModalStateEnum.SUCCESS);
				toast.success('Azure Integration: Account connected', {
					description: 'Azure Integration: Account connected',
					position: 'top-right',
					duration: 3000,
				});

				logEvent('Azure Integration: Account connected', {
					cloudAccountId: data?.data?.cloud_account_id,
					status: data?.data?.status,
				});
			} else if (Date.now() - startTimeRef.current >= errorTimeout) {
				// setModalState(ModalStateEnum.ERROR);

				toast.error('Azure Integration: Account connection attempt timed out', {
					description: 'Azure Integration: Account connection attempt timed out',
					position: 'top-right',
					duration: 3000,
				});

				logEvent('Azure Integration: Account connection attempt timed out', {
					id: deploymentCommands?.account_id,
				});
			}
		},
		onError: () => {
			toast.error('Azure Integration: Account connection attempt timed out', {
				description: 'Azure Integration: Account connection attempt timed out',
				position: 'top-right',
				duration: 3000,
			});
		},
	});

	useEffect(() => {
		if (
			deploymentCommands &&
			(deploymentCommands.az_shell_connection_command ||
				deploymentCommands.az_cli_connection_command)
		) {
			setTimeout(() => {
				setShowConnectionStatus(true);
			}, 3000);
		}
	}, [deploymentCommands]);

	return (
		<div className="azure-account-deploy-agent-step">
			<div className="azure-account-deploy-agent-step-subtitle">
				Copy the command and then use it to create the deployment stack.
			</div>
			<div className="azure-account-deploy-agent-step-commands">
				<Tabs
					className="azure-account-deploy-agent-step-commands-tabs"
					defaultValue="azure-shell"
					items={[
						{
							key: 'azure-shell',
							label: 'Azure Shell',
							children: (
								<div className="azure-account-deploy-agent-step-commands-tabs-content">
									<CodeBlock
										language="typescript"
										value={
											deploymentCommands?.az_shell_connection_command ||
											COMMAND_PLACEHOLDER
										}
										onCopy={handleCopyDeploymentCommand}
									/>
								</div>
							),
						},
						{
							key: 'azure-sdk',
							label: 'Azure SDK',
							children: (
								<div className="azure-account-deploy-agent-step-commands-tabs-content">
									<CodeBlock
										language="typescript"
										value={
											deploymentCommands?.az_cli_connection_command || COMMAND_PLACEHOLDER
										}
										onCopy={handleCopyDeploymentCommand}
									/>
								</div>
							),
						},
					]}
					variant="primary"
				/>
			</div>

			{showConnectionStatus && (
				<div className="azure-account-connection-status-container">
					<div className="azure-account-connection-status-content">
						<Callout
							className="azure-account-connection-status-callout"
							type={
								isAccountConnected ? ConnectionSuccess.type : ConnectionWarning.type
							}
							size="small"
							showIcon
							message={
								isAccountConnected ? ConnectionSuccess.title : ConnectionWarning.title
							}
						/>
					</div>

					<div className="azure-account-connection-status-close-disclosure">
						{isAccountConnected
							? ConnectionSuccess.description
							: ConnectionWarning.description}
					</div>
				</div>
			)}
		</div>
	);
};

export default function ConnectNewAzureAccount({
	connectionParams,
	isConnectionParamsLoading,
	onAccountConnected,
}: ConnectNewAzureAccountProps): JSX.Element {
	const [
		deploymentCommands,
		setDeploymentCommands,
	] = useState<IAzureDeploymentCommands | null>(null);
	const [accountId, setAccountId] = useState<string | null>(null);

	const steps = useMemo(() => {
		const steps: StepsProps['items'] = [
			{
				title: 'Prerequisites',
				description: <PrerequisitesStep />,
			},
			{
				title: 'Configure Agent',
				description: (
					<ConfigureAgentStep
						connectionParams={connectionParams}
						isConnectionParamsLoading={isConnectionParamsLoading}
						setDeploymentCommands={setDeploymentCommands}
						setAccountId={setAccountId}
					/>
				),
			},

			{
				title: 'Deploy Agent',
				description: (
					<DeployAgentStep
						deploymentCommands={deploymentCommands}
						accountId={accountId}
						onAccountConnected={onAccountConnected}
					/>
				),
			},
		];

		return steps;
	}, [
		connectionParams,
		isConnectionParamsLoading,
		deploymentCommands,
		accountId,
		onAccountConnected,
	]);

	return (
		<div className="azure-account-container">
			<Steps direction="vertical" current={1} items={steps} />
		</div>
	);
}
