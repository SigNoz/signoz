import { RadioGroup } from '@signozhq/ui/radio-group';
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
			<Typography.Text
				weight="bold"
				size="base"
				className={styles.drawerSurfaceHead}
			>
				Connection method
			</Typography.Text>

			<RadioGroup
				color="primary"
				textOverflow="wrap"
				value={value}
				onChange={(next): void =>
					onChange(next as CloudintegrationtypesGCPConnectionMethodDTO)
				}
				disabled={disabled}
				disabledTooltip="The connection method can't be changed once setup has started"
				items={[
					{
						value: CloudintegrationtypesGCPConnectionMethodDTO.manual,
						testId: 'gcp-connection-method-manual',
						label: (
							<>
								<Typography.Text weight="semibold" size="base" display="block">
									Connect Manually
								</Typography.Text>
								<Typography.Text
									as="p"
									size="small"
									color="muted"
									className={styles.methodRadioDesc}
								>
									Deploy your own OTel Collector.
								</Typography.Text>
							</>
						),
					},
					{
						value: CloudintegrationtypesGCPConnectionMethodDTO.agent,
						testId: 'gcp-connection-method-agent',
						label: (
							<>
								<Typography.Text weight="semibold" size="base" display="block">
									Connect via Agent
								</Typography.Text>
								<Typography.Text
									as="p"
									size="small"
									color="muted"
									className={styles.methodRadioDesc}
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

ConnectionMethodSelector.defaultProps = {
	disabled: false,
};

export default ConnectionMethodSelector;
