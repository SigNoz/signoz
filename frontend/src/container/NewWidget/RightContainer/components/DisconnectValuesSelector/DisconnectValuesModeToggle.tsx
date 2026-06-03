import { ToggleGroupSimple } from '@signozhq/ui/toggle-group';
import { Typography } from '@signozhq/ui/typography';
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
		<ToggleGroupSimple
			type="single"
			value={value}
			size="lg"
			onChange={(newValue: string): void => {
				if (newValue) {
					onChange(newValue as DisconnectedValuesMode);
				}
			}}
			items={[
				{
					value: DisconnectedValuesMode.Never,
					'aria-label': 'Never',
					label: (
						<Typography.Text className="section-heading-small">Never</Typography.Text>
					),
				},
				{
					value: DisconnectedValuesMode.Threshold,
					'aria-label': 'Threshold',
					label: (
						<Typography.Text className="section-heading-small">
							Threshold
						</Typography.Text>
					),
				},
			]}
		/>
	);
}
