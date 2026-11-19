import cx from 'classnames';

import {
	NOZ_BODY,
	NOZ_COLORS,
	NOZ_EYE,
	NOZ_HAT_PATH,
	NOZ_PUPIL_PATH,
} from './Noz.constants';

import styles from './Noz.module.scss';

interface NozProps {
	size?: number;
	className?: string;
}

/**
 * Noz — the SigNoz AI assistant mascot. Waves on hover.
 *
 * Hover behavior:
 *  - Hovering the icon itself triggers the wave.
 *  - To make a parent element (e.g. a Button) trigger the wave on its own
 *    hover, add the class `noz-wave` to that parent.
 */
export default function Noz({ size = 24, className }: NozProps): JSX.Element {
	return (
		<span
			className={cx(styles.noz, className)}
			style={{ width: size, height: size }}
			aria-hidden="true"
		>
			<svg
				viewBox="-2 0.5 28 28"
				width={size}
				height={size}
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
			>
				{/* body */}
				<rect {...NOZ_BODY} fill={NOZ_COLORS.body} />
				{/* legs */}
				<rect
					x="6.87012"
					y="19.0679"
					width="3.34679"
					height="3.69908"
					rx="0.880734"
					fill={NOZ_COLORS.body}
				/>
				<rect
					x="13.916"
					y="19.0679"
					width="3.34679"
					height="3.69908"
					rx="0.880734"
					fill={NOZ_COLORS.body}
				/>
				{/* right arm (static) */}
				<rect
					x="18.7598"
					y="13.4752"
					width="2.11376"
					height="3.69908"
					rx="0.880734"
					fill={NOZ_COLORS.body}
				/>
				{/* left arm: outer group does the "lift", inner does the wiggle */}
				<g className="noz-arm-left">
					<g className="noz-arm-wiggle">
						<rect
							x="3.12695"
							y="13.4752"
							width="2.11376"
							height="3.69908"
							rx="0.880734"
							fill={NOZ_COLORS.body}
						/>
					</g>
				</g>
				{/* head: face + eye + hat tilt together */}
				<g className="noz-head">
					<circle {...NOZ_EYE} fill={NOZ_COLORS.eye} />
					<path d={NOZ_PUPIL_PATH} fill={NOZ_COLORS.pupil} />
					<path d={NOZ_HAT_PATH} fill={NOZ_COLORS.hat} />
				</g>
			</svg>
		</span>
	);
}

Noz.defaultProps = {
	size: 24,
	className: undefined,
};
