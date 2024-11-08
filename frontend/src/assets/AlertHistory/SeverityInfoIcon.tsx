interface SeverityInfoIconProps {
	width?: number;
	height?: number;
	fill?: string;
	stroke?: string;
}

function SeverityInfoIcon({
	width,
	height,
	fill,
	stroke,
}: SeverityInfoIconProps): JSX.Element {
	return (
		<svg
			width={width}
			height={height}
			fill={fill}
			xmlns="http://www.w3.org/2000/svg"
		>
			<rect
				width={width}
				height={height}
				rx="3.5"
				fill={stroke}
				fillOpacity=".2"
			/>
			<path
				d="M7 9.33346V7.00012M7 4.66675H7.00583"
				stroke={stroke}
				strokeWidth="1.16667"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

SeverityInfoIcon.defaultProps = {
	width: 14,
	height: 14,
	fill: 'none',
	stroke: '#7190F9',
};

export default SeverityInfoIcon;
