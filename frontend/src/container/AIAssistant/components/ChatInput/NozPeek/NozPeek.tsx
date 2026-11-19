import { useRef } from 'react';
import {
	NOZ_BODY,
	NOZ_COLORS,
	NOZ_EYE,
	NOZ_HAT_PATH,
	NOZ_PUPIL_PATH,
} from 'components/Noz/Noz.constants';

import { useNozPupilTracking } from './useNozPupilTracking';

import styles from './NozPeek.module.scss';

/** Noz climbs over the input's top edge, hands first, then watches the cursor. */
export default function NozPeek(): JSX.Element {
	const eyeRef = useRef<SVGCircleElement>(null);
	const pupilRef = useRef<SVGGElement>(null);
	useNozPupilTracking(eyeRef, pupilRef);

	return (
		<>
			<div className={styles.body} data-testid="ai-noz-peek" aria-hidden>
				<svg
					className={styles.bodySvg}
					viewBox="0 0 24 24"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
				>
					<rect {...NOZ_BODY} fill={NOZ_COLORS.body} />
					<g className={styles.head}>
						<circle ref={eyeRef} {...NOZ_EYE} fill={NOZ_COLORS.eye} />
						<g
							ref={pupilRef}
							className={styles.pupil}
							data-testid="ai-noz-peek-pupil"
						>
							<path d={NOZ_PUPIL_PATH} fill={NOZ_COLORS.pupil} />
						</g>
						<path d={NOZ_HAT_PATH} fill={NOZ_COLORS.hat} />
					</g>
				</svg>
			</div>
			<div className={styles.hands} aria-hidden>
				<svg
					className={styles.handsSvg}
					viewBox="0 0 34 7"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
				>
					<rect
						width="3.52294"
						height="6.16514"
						rx="1.46789"
						fill={NOZ_COLORS.body}
					/>
					<rect
						x="30.4775"
						width="3.52294"
						height="6.16514"
						rx="1.46789"
						fill={NOZ_COLORS.body}
					/>
				</svg>
			</div>
		</>
	);
}
