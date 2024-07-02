import './rotatingSpinner.scss';

import { DEFAULT_SPINNER_COLOR } from 'components/Spinner/constants';
import { CSSProperties } from 'styled-components';

export default function RotatingSpinner({
	color,
}: RotatingSpinnerProps): JSX.Element {
	return (
		<svg
			width="auto"
			height="auto"
			viewBox="0 0 25 24"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			aria-label="loading"
			data-icon="loading"
		>
			<path
				d="M12.875 22C18.3978 22 22.875 17.5228 22.875 12C22.875 6.47715 18.3978 2 12.875 2C7.35215 2 2.875 6.47715 2.875 12C2.875 17.5228 7.35215 22 12.875 22Z"
				stroke="white"
				strokeOpacity="0.3"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				className="rotate"
				d="M22.875 11.999C22.875 6.47618 18.3978 1.99902 12.875 1.99902"
				stroke={color}
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

interface RotatingSpinnerProps {
	color?: CSSProperties['stroke'];
}
RotatingSpinner.defaultProps = {
	color: DEFAULT_SPINNER_COLOR,
};
