import { RadioGroup, RadioGroupItem } from '@signozhq/ui/radio-group';
import { Typography } from '@signozhq/ui/typography';
import { CloudintegrationtypesGCPConnectionMethodDTO } from 'api/generated/services/sigNoz.schemas';
import cx from 'classnames';

import styles from './ConnectionMethodSelector.module.scss';

interface ConnectionMethodSelectorProps {
	value: CloudintegrationtypesGCPConnectionMethodDTO;
	onChange: (
		connectionMethod: CloudintegrationtypesGCPConnectionMethodDTO,
	) => void;
	disabled?: boolean;
}

function ConnectionMethodSelector({
	value,
	onChange,
	disabled,
}: ConnectionMethodSelectorProps): JSX.Element {
	return (
		<div className={cx(styles.drawerSection, styles.drawerSurface)}>
			<div className={styles.drawerSurfaceHead}>
				<Typography.Text weight="bold" size="base">
					Connection method
				</Typography.Text>
			</div>

			<RadioGroup
				value={value}
				onChange={(next): void =>
					onChange(next as CloudintegrationtypesGCPConnectionMethodDTO)
				}
				disabled={disabled}
				className={styles.methodRadioGroup}
			>
				<RadioGroupItem
					value={CloudintegrationtypesGCPConnectionMethodDTO.manual}
					containerClassName={styles.methodRadio}
					testId="gcp-connection-method-manual"
				>
					<div className={styles.methodRadioTitle}>
						<Typography.Text weight="semibold" size="base">
							Connect Manually
						</Typography.Text>
					</div>
					<Typography.Text
						as="p"
						size="small"
						color="muted"
						className={styles.methodRadioDesc}
					>
						Deploy your own OTel Collector.
					</Typography.Text>
				</RadioGroupItem>

				<RadioGroupItem
					value={CloudintegrationtypesGCPConnectionMethodDTO.agent}
					containerClassName={styles.methodRadio}
					testId="gcp-connection-method-agent"
				>
					<div className={styles.methodRadioTitle}>
						<Typography.Text weight="semibold" size="base">
							Connect via Agent
						</Typography.Text>
					</div>
					<Typography.Text
						as="p"
						size="small"
						color="muted"
						className={styles.methodRadioDesc}
					>
						SigNoz deploys and manages the collector for you.
					</Typography.Text>
				</RadioGroupItem>
			</RadioGroup>
		</div>
	);
}

ConnectionMethodSelector.defaultProps = {
	disabled: false,
};

export default ConnectionMethodSelector;
