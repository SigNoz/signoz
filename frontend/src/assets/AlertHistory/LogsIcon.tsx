interface LogsIconProps {
	width?: number;
	height?: number;
	fill?: string;
	strokeColor?: string;
	strokeWidth?: number;
}

function LogsIcon({
	width,
	height,
	fill,
	strokeColor,
	strokeWidth,
}: LogsIconProps): JSX.Element {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width={width}
			height={height}
			fill={fill}
		>
			<path
				stroke={strokeColor}
				strokeWidth={strokeWidth}
				d="M2.917 3.208v7.875"
			/>
			<ellipse
				cx="6.417"
				cy="3.208"
				stroke={strokeColor}
				strokeWidth={strokeWidth}
				rx="3.5"
				ry="1.458"
			/>
			<ellipse cx="6.417" cy="3.165" fill={strokeColor} rx="0.875" ry="0.365" />
			<path
				stroke={strokeColor}
				strokeWidth={strokeWidth}
				d="M9.917 11.083c0 .645-1.567 1.167-3.5 1.167s-3.5-.522-3.5-1.167"
			/>
			<path
				stroke={strokeColor}
				strokeLinecap="round"
				strokeWidth={strokeWidth}
				d="M5.25 6.417v1.117c0 .028.02.053.049.057l1.652.276A.058.058 0 017 7.924v1.993"
			/>
			<path
				stroke={strokeColor}
				strokeWidth={strokeWidth}
				d="M9.917 3.208v3.103c0 .046.05.074.089.05L12.182 5a.058.058 0 01.088.035l.264 1.059a.058.058 0 01-.013.053l-2.59 2.877a.058.058 0 00-.014.04v2.018"
			/>
		</svg>
	);
}

LogsIcon.defaultProps = {
	width: 14,
	height: 14,
	fill: 'none',
	strokeColor: '#C0C1C3',
	strokeWidth: 1.167,
};

export default LogsIcon;
