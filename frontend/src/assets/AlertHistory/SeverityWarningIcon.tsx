interface SeverityWarningIconProps {
	width?: number;
	height?: number;
	fill?: string;
	stroke?: string;
	strokeWidth?: string;
}

function SeverityWarningIcon({
	width,
	height,
	fill,
	stroke,
	strokeWidth,
}: SeverityWarningIconProps): JSX.Element {
	return (
		<svg
			width={width}
			height={height}
			fill={fill}
			xmlns="http://www.w3.org/2000/svg"
		>
			<path
				d="M1.00732.957845 1.00732 2.99951M1.00732 5.04175H1.00179"
				stroke={stroke}
				strokeWidth={strokeWidth}
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

SeverityWarningIcon.defaultProps = {
	width: 2,
	height: 6,
	fill: 'none',
	stroke: '#FFD778',
	strokeWidth: '0.978299',
};

export default SeverityWarningIcon;
