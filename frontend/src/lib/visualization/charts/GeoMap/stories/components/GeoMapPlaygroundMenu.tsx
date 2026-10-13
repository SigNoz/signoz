import { GeoMapSelection } from '../../types';

import styles from './GeoMapPlayground.module.scss';

interface GeoMapPlaygroundMenuProps {
	selection: GeoMapSelection;
	name: string;
	/** Group-by key the drilldown filter would use. */
	field: string;
	formatValue: (value: number) => string;
	onClose: () => void;
}

/** Stand-in for the dashboard drilldown menu the panel would open. */
export default function GeoMapPlaygroundMenu({
	selection,
	name,
	field,
	formatValue,
	onClose,
}: GeoMapPlaygroundMenuProps): JSX.Element {
	const { datum, clientX, clientY } = selection;
	return (
		<div
			className={styles.menu}
			style={{ left: clientX + 8, top: clientY + 8 }}
			data-testid="geo-map-drilldown-menu"
		>
			<div className={styles.menuTitle}>
				{name} · {formatValue(datum.value)}
			</div>
			<button type="button" onClick={onClose} data-testid="geo-map-menu-filter">
				Filter dashboard: {field} = {datum.raw}
			</button>
			<button type="button" onClick={onClose} data-testid="geo-map-menu-logs">
				View in Logs
			</button>
			<button type="button" onClick={onClose} data-testid="geo-map-menu-traces">
				View in Traces
			</button>
			<button type="button" onClick={onClose} data-testid="geo-map-menu-breakout">
				Breakout by…
			</button>
		</div>
	);
}
