import { DashboardtypesThresholdFormatDTO } from 'api/generated/services/sigNoz.schemas';

import styles from '../../ThresholdsSection.module.scss';

type ThresholdMarkerProps =
	| { kind: 'line'; color: string }
	| { kind: 'format'; color: string; format?: DashboardtypesThresholdFormatDTO };

function ThresholdMarker(props: ThresholdMarkerProps): JSX.Element {
	const { color } = props;
	if (props.kind === 'line') {
		return (
			<svg width={16} height={4} className={styles.marker} aria-hidden>
				<line
					x1={1}
					y1={2}
					x2={15}
					y2={2}
					stroke={color}
					strokeWidth={2}
					strokeDasharray="3 2"
				/>
			</svg>
		);
	}
	const filled = props.format !== DashboardtypesThresholdFormatDTO.text;
	return (
		<span
			className={styles.markerSquare}
			style={filled ? { backgroundColor: color } : { borderColor: color }}
			aria-hidden
		/>
	);
}

export default ThresholdMarker;
