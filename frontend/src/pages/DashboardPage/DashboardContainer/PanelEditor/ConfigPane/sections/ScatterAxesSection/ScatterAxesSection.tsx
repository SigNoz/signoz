import type {
	SectionEditorProps,
	SectionKind,
} from 'pages/DashboardPage/DashboardContainer/Panels/types/sections';

import ScatterAxisFields from './ScatterAxisFields';

/** Edits a Scatter Plot's `axes` slice: soft bounds and scale, per axis. */
function ScatterAxesSection({
	value,
	defaultValue,
	onChange,
}: SectionEditorProps<SectionKind.ScatterAxes>): JSX.Element {
	return (
		<>
			<ScatterAxisFields
				axis="x"
				value={value?.x}
				defaultValue={defaultValue?.x}
				onChange={(x): void => onChange({ ...value, x })}
			/>
			<ScatterAxisFields
				axis="y"
				value={value?.y}
				defaultValue={defaultValue?.y}
				onChange={(y): void => onChange({ ...value, y })}
			/>
		</>
	);
}

export default ScatterAxesSection;
