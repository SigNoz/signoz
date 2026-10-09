import ConfigField from '../../controls/ConfigField/ConfigField';
import ConfigTiles, {
	type ConfigTileItem,
} from '../../controls/ConfigTiles/ConfigTiles';

interface AxisScaleFieldProps<T extends string> {
	testId: string;
	'aria-label': string;
	value: T;
	items: ConfigTileItem<T>[];
	/** Help for each scale, shown for the selected one. */
	help: Record<T, string>;
	onChange: (next: T) => void;
}

function AxisScaleField<T extends string>({
	testId,
	'aria-label': ariaLabel,
	value,
	items,
	help,
	onChange,
}: AxisScaleFieldProps<T>): JSX.Element {
	return (
		<ConfigField label="Scale" help={help[value]}>
			<ConfigTiles
				testId={testId}
				aria-label={ariaLabel}
				value={value}
				items={items}
				onChange={onChange}
			/>
		</ConfigField>
	);
}

export default AxisScaleField;
