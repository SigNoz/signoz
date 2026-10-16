import { LoaderCircle } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { Callout } from '@signozhq/ui/callout';
import { CloudintegrationtypesGCPConnectionMethodDTO } from 'api/generated/services/sigNoz.schemas';
import { ModalStateEnum } from 'container/Integrations/HeroSection/types';
import { useAgentAccountSetup } from 'hooks/integration/gcp/useAgentAccountSetup';
import { useForm } from 'react-hook-form';

import ConnectionMethodSelector from '../ConnectionMethodSelector';
import ConnectionSecretsFields from '../ConnectionSecretsFields';
import { AGENT_SETUP_GUIDE, DEFAULT_SETUP_FORM_VALUES } from '../constants';
import DeploymentProjectIdField from '../fields/DeploymentProjectIdField';
import DeploymentRegionField from '../fields/DeploymentRegionField';
import SetupDrawerFooter from '../SetupDrawerFooter';
import SetupGuideCallout from '../SetupGuideCallout';
import { GcpSetupFormValues } from '../types';
import { usePrefillCredentials } from '../usePrefillCredentials';
import AgentSetupCommands from './AgentSetupCommands';

import styles from './AgentSetup.module.scss';

interface AgentSetupProps {
	footerSlot: HTMLDivElement | null;
	onConnectionMethodChange: (
		connectionMethod: CloudintegrationtypesGCPConnectionMethodDTO,
	) => void;
	onCommandsGenerated: () => void;
	/** Asks to leave the setup; the parent may confirm before closing. */
	onCancel: () => void;
	onClose: () => void;
}

function AgentSetup({
	footerSlot,
	onConnectionMethodChange,
	onCommandsGenerated,
	onCancel,
	onClose,
}: AgentSetupProps): JSX.Element {
	const {
		isLoading,
		generateCommands,
		connectionParams,
		isConnectionParamsLoading,
		submitError,
		clearSubmitError,
		connectionCommands,
		commandsProjectId,
		modalState,
		checkConnectionAgain,
	} = useAgentAccountSetup({ onClose, onCommandsGenerated });

	const { control, handleSubmit, setValue } = useForm<GcpSetupFormValues>({
		defaultValues: DEFAULT_SETUP_FORM_VALUES,
	});

	usePrefillCredentials(connectionParams, setValue);

	return (
		<>
			<ConnectionMethodSelector
				value={CloudintegrationtypesGCPConnectionMethodDTO.agent}
				onChange={onConnectionMethodChange}
				disabled={isLoading || Boolean(connectionCommands)}
			/>
			<SetupGuideCallout {...AGENT_SETUP_GUIDE} />
			{connectionCommands ? (
				<>
					<AgentSetupCommands
						deploymentProjectId={commandsProjectId}
						commands={connectionCommands}
					/>
					{modalState === ModalStateEnum.WAITING && (
						<Callout
							type="info"
							showIcon={false}
							title={
								<div className={styles.waitingMessage}>
									<LoaderCircle size={14} className="animate-spin" />
									Waiting for GCP account connection, retrying in 10 secs...
								</div>
							}
							testId="gcp-agent-waiting"
						/>
					)}
					{modalState === ModalStateEnum.ERROR && (
						<Callout
							type="error"
							showIcon
							title="We couldn't establish a connection to your GCP account. Please try again"
							testId="gcp-agent-connection-error"
						/>
					)}
				</>
			) : (
				<>
					<DeploymentProjectIdField
						control={control}
						tooltip="The GCP project where SigNoz deploys the agent. The agent monitors this project."
					/>
					<DeploymentRegionField
						control={control}
						tooltip="The GCP region where the agent resources are deployed"
					/>
					<ConnectionSecretsFields
						control={control}
						isLoading={isConnectionParamsLoading}
						connectionParams={connectionParams}
					/>
				</>
			)}
			<SetupDrawerFooter
				slot={footerSlot}
				errorTitle="Failed to generate GCP setup commands"
				error={submitError}
				onDismissError={clearSubmitError}
				onCancel={onCancel}
			>
				{!connectionCommands && (
					<Button
						variant="solid"
						color="primary"
						onClick={handleSubmit(generateCommands)}
						loading={isLoading}
						disabled={isConnectionParamsLoading}
						testId="gcp-generate-commands-btn"
					>
						Generate Commands
					</Button>
				)}
				{modalState === ModalStateEnum.ERROR && (
					<Button
						variant="solid"
						color="primary"
						onClick={checkConnectionAgain}
						testId="gcp-check-connection-btn"
					>
						Check Again
					</Button>
				)}
			</SetupDrawerFooter>
		</>
	);
}

export default AgentSetup;
