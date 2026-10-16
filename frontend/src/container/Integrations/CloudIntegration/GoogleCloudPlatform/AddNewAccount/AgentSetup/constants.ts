import { CloudintegrationtypesGCPConnectionArtifactDTO } from 'api/generated/services/sigNoz.schemas';

interface AgentSetupStep {
	command: keyof CloudintegrationtypesGCPConnectionArtifactDTO;
	title: string;
	description: string;
}

// Order matters: step 2 grants access to the secrets created in step 1, and step 3
// reads the secret versions that step 1 exports into the shell.
export const AGENT_SETUP_STEPS: AgentSetupStep[] = [
	{
		command: 'createSecretsCommand',
		title: 'Store SigNoz credentials in Secret Manager',
		description:
			'Enables the required Google Cloud APIs and saves your SigNoz API key and ingestion key as secrets. This command contains your keys, so do not share it.',
	},
	{
		command: 'createServiceAccountCommand',
		title: 'Create the bootstrap service account',
		description:
			'Creates the service account that Infrastructure Manager uses to deploy the agent, and grants it the roles it needs.',
	},
	{
		command: 'cliCommand',
		title: 'Deploy the agent',
		description:
			'Deploys the SigNoz agent with Infrastructure Manager. This can take a few minutes.',
	},
];
