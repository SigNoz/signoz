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
import AgentSetupCommand from './AgentSetupCommand';

import styles from './AgentSetup.module.scss';

interface AgentSetupProps {
	footerSlot: HTMLDivElement | null;
	onConnectionMethodChange: (
		connectionMethod: CloudintegrationtypesGCPConnectionMethodDTO,
	) => void;
	onCommandGenerated: () => void;
	/** Asks to leave the setup; the parent may confirm before closing. */
	onCancel: () => void;
	onClose: () => void;
}

function AgentSetup({
	footerSlot,
	onConnectionMethodChange,
	onCommandGenerated,
	onCancel,
	onClose,
}: AgentSetupProps): JSX.Element {
	const {
		isLoading,
		generateCommand,
		connectionParams,
		isConnectionParamsLoading,
		submitError,
		clearSubmitError,
		connectionCommand,
		commandProjectId,
		modalState,
		checkConnectionAgain,
	} = useAgentAccountSetup({ onClose, onCommandGenerated });

	const { control, handleSubmit, setValue } = useForm<GcpSetupFormValues>({
		defaultValues: DEFAULT_SETUP_FORM_VALUES,
	});

	usePrefillCredentials(connectionParams, setValue);

	return (
		<>
			<ConnectionMethodSelector
				value={CloudintegrationtypesGCPConnectionMethodDTO.agent}
				onChange={onConnectionMethodChange}
				disabled={isLoading || Boolean(connectionCommand)}
			/>
			<SetupGuideCallout {...AGENT_SETUP_GUIDE} />
			{connectionCommand ? (
				<>
					<AgentSetupCommand
						deploymentProjectId={commandProjectId}
						command={connectionCommand}
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
						connectionMethod={CloudintegrationtypesGCPConnectionMethodDTO.agent}
					/>
					<DeploymentRegionField
						control={control}
						connectionMethod={CloudintegrationtypesGCPConnectionMethodDTO.agent}
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
				errorTitle="Failed to generate the GCP setup command"
				error={submitError}
				onDismissError={clearSubmitError}
				onCancel={onCancel}
			>
				{!connectionCommand && (
					<Button
						size="md"
						variant="solid"
						color="primary"
						onClick={handleSubmit(generateCommand)}
						loading={isLoading || isConnectionParamsLoading}
						testId="gcp-generate-command-btn"
					>
						Generate Command
					</Button>
				)}
				{modalState === ModalStateEnum.ERROR && (
					<Button
						size="md"
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
