import { Braces, ChartBar, DraftingCompass, ScrollText } from '@signozhq/icons';
import ContextMenu from 'periscope/components/ContextMenu';

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

/**
 * The dashboard's own ContextMenu with stand-in actions. Its backdrop is what
 * keeps the map inert until a click outside closes the menu.
 */
export default function GeoMapPlaygroundMenu({
	selection,
	name,
	field,
	formatValue,
	onClose,
}: GeoMapPlaygroundMenuProps): JSX.Element {
	const { datum, clientX, clientY } = selection;
	return (
		<ContextMenu
			coordinates={{ x: clientX, y: clientY }}
			onClose={onClose}
			items={
				<div data-testid="geo-map-drilldown-menu">
					<ContextMenu.Header>
						<div className={styles.menuTitle}>
							{name} · {formatValue(datum.value)}
						</div>
					</ContextMenu.Header>
					<ContextMenu.Item icon={<Braces size={16} />} onClick={onClose}>
						<span data-testid="geo-map-menu-filter">
							Filter dashboard: {field} = {datum.raw}
						</span>
					</ContextMenu.Item>
					<ContextMenu.Item icon={<ScrollText size={16} />} onClick={onClose}>
						<span data-testid="geo-map-menu-logs">View in Logs</span>
					</ContextMenu.Item>
					<ContextMenu.Item icon={<DraftingCompass size={16} />} onClick={onClose}>
						<span data-testid="geo-map-menu-traces">View in Traces</span>
					</ContextMenu.Item>
					<ContextMenu.Item icon={<ChartBar size={16} />} onClick={onClose}>
						<span data-testid="geo-map-menu-breakout">Breakout by…</span>
					</ContextMenu.Item>
				</div>
			}
		/>
	);
}
