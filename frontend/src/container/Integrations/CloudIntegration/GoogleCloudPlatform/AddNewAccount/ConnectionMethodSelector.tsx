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
			<div className={styles.drawerSurfaceHead}>
				<Typography
					variant="paragraph"
					size="base"
					weight="bold"
					color="inherit"
					as="span"
					textOverflow="wrap"
				>
					Connection method
				</Typography>
			</div>

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
								<Typography
									variant="paragraph"
									size="base"
									weight="bold"
									color="inherit"
									as="p"
									textOverflow="wrap"
								>
									Connect Manually
								</Typography>
								<Typography
									variant="paragraph"
									size="small"
									weight="regular"
									color="secondary"
									as="p"
									display="inline-block"
									textOverflow="wrap"
								>
									Deploy your own OTel Collector.
								</Typography>
							</>
						),
					},
					{
						value: CloudintegrationtypesGCPConnectionMethodDTO.agent,
						testId: 'gcp-connection-method-agent',
						label: (
							<>
								<Typography
									variant="paragraph"
									size="base"
									weight="bold"
									color="inherit"
									as="p"
									textOverflow="wrap"
								>
									Connect via Agent
								</Typography>
								<Typography
									variant="paragraph"
									size="small"
									weight="regular"
									color="secondary"
									as="p"
									display="inline-block"
									textOverflow="wrap"
								>
									SigNoz deploys and manages the collector for you.
								</Typography>
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
