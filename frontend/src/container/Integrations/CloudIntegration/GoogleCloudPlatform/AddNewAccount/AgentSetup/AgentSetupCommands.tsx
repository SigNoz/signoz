import { useState } from 'react';
import { Typography } from '@signozhq/ui/typography';
import { CloudintegrationtypesGCPConnectionArtifactDTO } from 'api/generated/services/sigNoz.schemas';

import AgentSetupStep from './AgentSetupStep';
import { AGENT_SETUP_STEPS } from './constants';

import styles from './AgentSetupCommands.module.scss';

interface AgentSetupCommandsProps {
	deploymentProjectId: string;
	commands: CloudintegrationtypesGCPConnectionArtifactDTO;
}

function AgentSetupCommands({
	deploymentProjectId,
	commands,
}: AgentSetupCommandsProps): JSX.Element {
	// Only the first step starts open; Next walks the user through the rest in order.
	const [expandedSteps, setExpandedSteps] = useState<boolean[]>(() =>
		AGENT_SETUP_STEPS.map((_, index) => index === 0),
	);

	const toggleStep = (index: number): void => {
		setExpandedSteps((steps) =>
			steps.map((isExpanded, i) => (i === index ? !isExpanded : isExpanded)),
		);
	};

	const openNextStep = (index: number): void => {
		setExpandedSteps((steps) =>
			steps.map((isExpanded, i) => {
				if (i === index) {
					return false;
				}
				if (i === index + 1) {
					return true;
				}
				return isExpanded;
			}),
		);
	};

	return (
		<div className={styles.commands} data-testid="gcp-agent-commands">
			<div className={styles.commandsHead}>
				<Typography.Text weight="bold" size="base">
					Deploy the SigNoz agent
				</Typography.Text>
				<Typography.Text as="p" size="small" color="muted">
					Run these commands in order in Google Cloud Shell, or in a terminal where
					gcloud is signed in to{' '}
					<span className={styles.mono}>{deploymentProjectId}</span>. Use the same
					shell session for all three.
				</Typography.Text>
			</div>
			<div>
				{AGENT_SETUP_STEPS.map((step, index) => {
					const isLastStep = index === AGENT_SETUP_STEPS.length - 1;
					return (
						<AgentSetupStep
							key={step.command}
							stepNumber={index + 1}
							title={step.title}
							description={step.description}
							command={commands[step.command]}
							isExpanded={expandedSteps[index]}
							onToggle={(): void => toggleStep(index)}
							onNext={isLastStep ? undefined : (): void => openNextStep(index)}
						/>
					);
				})}
			</div>
		</div>
	);
}

export default AgentSetupCommands;
