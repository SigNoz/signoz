import { Pin } from '@signozhq/icons';

import Styles from './TooltipPinnedBadge.module.scss';

export default function TooltipPinnedBadge(): JSX.Element {
	return (
		<div className={Styles.status} data-testid="uplot-tooltip-status">
			<Pin size={12} />
			<span>Pinned</span>
		</div>
	);
}
