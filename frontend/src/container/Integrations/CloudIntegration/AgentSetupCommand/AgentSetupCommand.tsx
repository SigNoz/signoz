import { ReactNode } from 'react';
import { Typography } from '@signozhq/ui/typography';
import CodeBlock from 'components/CodeBlock/CodeBlock';

import styles from './AgentSetupCommand.module.scss';

interface AgentSetupCommandProps {
	description: ReactNode;
	command: string;
	testId: string;
}

function AgentSetupCommand({
	description,
	command,
	testId,
}: AgentSetupCommandProps): JSX.Element {
	return (
		<div className={styles.commands} data-testid={testId}>
			<div className={styles.commandsHead}>
				<Typography.Text weight="bold" size="base">
					Deploy the SigNoz agent
				</Typography.Text>
				<Typography.Text as="p" size="small" color="muted">
					{description}
				</Typography.Text>
			</div>
			<CodeBlock language="bash" code={command} className={styles.command} />
		</div>
	);
}

export default AgentSetupCommand;
