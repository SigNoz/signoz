import { CSSProperties } from 'react';

function BarIcon({
	fillColor,
}: {
	fillColor: CSSProperties['color'];
}): JSX.Element {
	return (
		<svg
			width="30"
			height="30"
			viewBox="0 0 24 24"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
		>
			<path
				d="M8 2H6C4.89543 2 4 2.89543 4 4V16C4 17.1046 4.89543 18 6 18H8C9.10457 18 10 17.1046 10 16V4C10 2.89543 9.10457 2 8 2Z"
				stroke={fillColor}
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="M18 9H16C14.8954 9 14 9.89543 14 11V16C14 17.1046 14.8954 18 16 18H18C19.1046 18 20 17.1046 20 16V11C20 9.89543 19.1046 9 18 9Z"
				stroke={fillColor}
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="M22 22H2"
				stroke={fillColor}
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

export default BarIcon;
