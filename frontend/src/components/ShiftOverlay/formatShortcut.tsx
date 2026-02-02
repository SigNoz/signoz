import { ReactNode } from 'react';
import { ArrowUp, ChevronUp, Command, Option } from 'lucide-react';

import './shiftOverlay.scss';

export function formatShortcut(shortcut?: string[]): ReactNode {
	if (!shortcut || shortcut.length === 0) {
		return null;
	}

	const combo = shortcut.find((s) => typeof s === 'string' && s.trim());
	if (!combo) {
		return null;
	}

	return combo.split('+').map((key) => {
		const k = key.trim().toLowerCase();

		let node: ReactNode;
		switch (k) {
			case 'shift':
				node = <ArrowUp size={14} />;
				break;
			case 'cmd':
			case 'meta':
				node = <Command size={14} />;
				break;
			case 'alt':
				node = <Option size={14} />;
				break;
			case 'ctrl':
			case 'control':
				node = <ChevronUp size={14} />;
				break;
			case 'arrowup':
				node = <ArrowUp size={14} />;
				break;
			default:
				node = k.toUpperCase();
		}

		return (
			<span key={`shortcut-${k}`} className="shift-overlay__key">
				{node}
			</span>
		);
	});
}
