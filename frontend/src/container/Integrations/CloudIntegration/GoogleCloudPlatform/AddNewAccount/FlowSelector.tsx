import { SquareTerminal, Star } from '@signozhq/icons';
import cx from 'classnames';

import styles from './FlowSelector.module.scss';

export type SetupFlow = 'manual' | 'agent';

interface FlowSelectorProps {
	value: SetupFlow;
	onChange: (flow: SetupFlow) => void;
}

function FlowSelector({ value, onChange }: FlowSelectorProps): JSX.Element {
	return (
		<div className={styles.flowSelector}>
			<div className={styles.label}>Connection method</div>

			<button
				type="button"
				data-testid="gcp-flow-manual"
				className={cx(styles.option, {
					[styles.isSelected]: value === 'manual',
				})}
				onClick={(): void => onChange('manual')}
			>
				<span className={styles.iconBox}>
					<SquareTerminal size={18} />
				</span>
				<span className={styles.optionBody}>
					<span className={styles.optionTitle}>Connect Manually</span>
					<span className={styles.optionDescription}>
						Deploy your own OTel Collector and configure log sinks
					</span>
				</span>
				<span className={styles.radio} aria-hidden />
			</button>

			<button
				type="button"
				data-testid="gcp-flow-agent"
				className={cx(styles.option, styles.isDisabled)}
				disabled
				aria-disabled
			>
				<span className={styles.iconBox}>
					<Star size={18} />
				</span>
				<span className={styles.optionBody}>
					<span className={styles.optionTitle}>
						Connect via Agent
						<span className={styles.soonBadge}>Soon</span>
					</span>
					<span className={styles.optionDescription}>
						SigNoz deploys and manages the collector for you
					</span>
				</span>
			</button>
		</div>
	);
}

export default FlowSelector;
