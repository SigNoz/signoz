import { Badge } from '@signozhq/ui/badge';
import { RadioGroup, RadioGroupItem } from '@signozhq/ui/radio-group';
import { Typography } from '@signozhq/ui/typography';
import cx from 'classnames';

import { SetupFlow } from './types';
import styles from './FlowSelector.module.scss';

interface FlowSelectorProps {
	value: SetupFlow;
	onChange: (flow: SetupFlow) => void;
}

function FlowSelector({ value, onChange }: FlowSelectorProps): JSX.Element {
	return (
		<div className={cx(styles.drawerSection, styles.drawerSurface)}>
			<div className={styles.drawerSurfaceHead}>
				<Typography.Text weight="bold" size="base">
					Connection method
				</Typography.Text>
			</div>

			<RadioGroup
				value={value}
				onChange={(next): void => onChange(next as SetupFlow)}
				className={styles.flowRadioGroup}
			>
				<RadioGroupItem
					value="manual"
					containerClassName={cx(styles.flowRadio, styles.flowRadioManual)}
					testId="gcp-flow-manual"
				>
					<div className={styles.flowRadioTitle}>
						<Typography.Text weight="semibold" size="base">
							Connect Manually
						</Typography.Text>
					</div>
					<Typography.Text
						as="p"
						size="small"
						color="muted"
						className={styles.flowRadioDesc}
					>
						Deploy your own OTel Collector and configure log sinks.
					</Typography.Text>
				</RadioGroupItem>

				<RadioGroupItem
					value="agent"
					containerClassName={styles.flowRadio}
					testId="gcp-flow-agent"
					disabled
				>
					<div className={styles.flowRadioTitle}>
						<Typography.Text weight="semibold" size="base">
							Connect via Agent
						</Typography.Text>
						<Badge color="robin" variant="default">
							Soon
						</Badge>
					</div>
					<Typography.Text
						as="p"
						size="small"
						color="muted"
						className={styles.flowRadioDesc}
					>
						SigNoz deploys and manages the collector for you.
					</Typography.Text>
				</RadioGroupItem>
			</RadioGroup>
		</div>
	);
}

export default FlowSelector;
