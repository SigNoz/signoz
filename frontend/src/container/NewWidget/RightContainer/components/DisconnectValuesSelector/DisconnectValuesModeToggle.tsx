import { ToggleGroup, ToggleGroupItem } from '@signozhq/ui';
import { Typography } from 'antd';
import { DisconnectedValuesMode } from 'lib/uPlotV2/config/types';

interface DisconnectValuesModeToggleProps {
	value: DisconnectedValuesMode;
	onChange: (value: DisconnectedValuesMode) => void;
}

export default function DisconnectValuesModeToggle({
	value,
	onChange,
}: DisconnectValuesModeToggleProps): JSX.Element {
	return (
		<ToggleGroup
			type="single"
			value={value}
			size="lg"
			onChange={(newValue): void => {
				if (newValue) {
					onChange(newValue as DisconnectedValuesMode);
				}
			}}
		>
			<ToggleGroupItem value={DisconnectedValuesMode.Never} aria-label="Never">
				<Typography.Text className="section-heading-small">Never</Typography.Text>
			</ToggleGroupItem>
			<ToggleGroupItem
				value={DisconnectedValuesMode.Threshold}
				aria-label="Threshold"
			>
				<Typography.Text className="section-heading-small">
					Threshold
				</Typography.Text>
			</ToggleGroupItem>
		</ToggleGroup>
	);
}
