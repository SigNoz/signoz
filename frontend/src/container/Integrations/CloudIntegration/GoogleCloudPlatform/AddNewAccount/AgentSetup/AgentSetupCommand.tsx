import { Typography } from '@signozhq/ui/typography';
import CodeBlock from 'components/CodeBlock/CodeBlock';

import styles from './AgentSetupCommand.module.scss';

interface AgentSetupCommandProps {
	deploymentProjectId: string;
	command: string;
}

function AgentSetupCommand({
	deploymentProjectId,
	command,
}: AgentSetupCommandProps): JSX.Element {
	return (
		<div className={styles.commands} data-testid="gcp-agent-command">
			<div className={styles.commandsHead}>
				<Typography.Text weight="bold" size="base">
					Deploy the SigNoz agent
				</Typography.Text>
				<Typography.Text as="p" size="small" color="muted">
					Run this command in Google Cloud Shell, or in a terminal where gcloud is
					signed in to <span className={styles.mono}>{deploymentProjectId}</span>. It
					contains your SigNoz keys, so do not share it.
				</Typography.Text>
			</div>
			<CodeBlock language="bash" code={command} className={styles.command} />
		</div>
	);
}

export default AgentSetupCommand;
