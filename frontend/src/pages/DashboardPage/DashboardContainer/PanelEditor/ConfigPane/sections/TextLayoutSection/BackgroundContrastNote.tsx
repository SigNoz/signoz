import { TriangleAlert } from '@signozhq/icons';
import cx from 'classnames';
import {
	contrastRatio,
	inkForSurface,
	MIN_CONTRAST_RATIO,
} from 'pages/DashboardPage/DashboardContainer/Panels/kinds/TextPanel/background/contrast';

import styles from './BackgroundContrastNote.module.scss';

interface BackgroundContrastNoteProps {
	testId: string;
	color: string;
}

/** Warns below the contrast floor but never blocks the choice. */
function BackgroundContrastNote({
	testId,
	color,
}: BackgroundContrastNoteProps): JSX.Element {
	const ratio = contrastRatio(inkForSurface(color), color);
	const isLegible = ratio >= MIN_CONTRAST_RATIO;

	return (
		<div
			className={cx(styles.contrast, { [styles.warning]: !isLegible })}
			data-testid={testId}
		>
			{!isLegible && <TriangleAlert size={12} />}
			<span className="translate-safe">
				{isLegible
					? `Contrast ${ratio.toFixed(1)}:1`
					: `Contrast ${ratio.toFixed(1)}:1 — below the ${MIN_CONTRAST_RATIO}:1 minimum`}
			</span>
		</div>
	);
}

export default BackgroundContrastNote;
