import { ChevronDown, ChevronRight } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { Typography } from '@signozhq/ui/typography';
import cx from 'classnames';
import CodeBlock from 'components/CodeBlock/CodeBlock';

import styles from './AgentSetupStep.module.scss';

interface AgentSetupStepProps {
	stepNumber: number;
	title: string;
	description: string;
	command: string;
	isExpanded: boolean;
	onToggle: () => void;
	/** Omitted on the last step, which has no next step to open. */
	onNext?: () => void;
}

function AgentSetupStep({
	stepNumber,
	title,
	description,
	command,
	isExpanded,
	onToggle,
	onNext,
}: AgentSetupStepProps): JSX.Element {
	const testId = `gcp-agent-step-${stepNumber}`;
	const bodyId = `${testId}-body`;
	const isLastStep = !onNext;

	return (
		<div
			className={cx(styles.step, { [styles.lastStep]: isLastStep })}
			data-testid={testId}
		>
			<div className={styles.indicator}>
				<span className={styles.stepNumber}>{stepNumber}</span>
				{!isLastStep && <span className={styles.connector} />}
			</div>
			<div className={styles.content}>
				<button
					type="button"
					className={styles.toggle}
					onClick={onToggle}
					aria-expanded={isExpanded}
					aria-controls={bodyId}
					data-testid={`${testId}-toggle`}
				>
					<Typography.Text weight="semibold" size="base">
						{title}
					</Typography.Text>
					{isExpanded ? (
						<ChevronDown size={14} className={styles.chevron} />
					) : (
						<ChevronRight size={14} className={styles.chevron} />
					)}
				</button>
				{isExpanded && (
					<div id={bodyId} className={styles.body}>
						<Typography.Text as="p" size="small" color="muted">
							{description}
						</Typography.Text>
						<CodeBlock language="bash" code={command} className={styles.command} />
						{onNext && (
							<div className={styles.actions}>
								<Button
									variant="solid"
									color="primary"
									size="sm"
									onClick={onNext}
									testId={`${testId}-next`}
								>
									Next
								</Button>
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
}

AgentSetupStep.defaultProps = {
	onNext: undefined,
};

export default AgentSetupStep;
