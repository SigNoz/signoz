import { Badge } from '@signozhq/ui/badge';
import { RadioGroup } from '@signozhq/ui/radio-group';
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
				color="primary"
				textOverflow="wrap"
				value={value}
				onChange={(next): void => onChange(next as SetupFlow)}
				items={[
					{
						value: 'manual',
						testId: 'gcp-flow-manual',
						label: (
							<>
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
									Deploy your own OTel Collector.
								</Typography.Text>
							</>
						),
					},
					{
						value: 'agent',
						testId: 'gcp-flow-agent',
						disabled: true,
						disabledTooltip: 'Soon',
						label: (
							<>
								<div className={styles.flowRadioTitle}>
									<Typography.Text weight="semibold" size="base">
										Connect via Agent
									</Typography.Text>
									<Badge color="primary" variant="solid">
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
							</>
						),
					},
				]}
			/>
		</div>
	);
}

export default FlowSelector;
