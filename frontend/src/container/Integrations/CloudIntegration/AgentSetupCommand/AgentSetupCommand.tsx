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
				<Typography
					variant="paragraph"
					size="base"
					weight="bold"
					color="inherit"
					as="span"
					textOverflow="wrap"
				>
					Deploy the SigNoz agent
				</Typography>
				<Typography
					variant="paragraph"
					size="small"
					weight="regular"
					color="secondary"
					as="p"
					display="inline"
					textOverflow="wrap"
				>
					{description}
				</Typography>
			</div>
			<CodeBlock language="bash" code={command} className={styles.command} />
		</div>
	);
}

export default AgentSetupCommand;
