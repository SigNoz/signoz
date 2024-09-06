interface SeverityCriticalIconProps {
	width?: number;
	height?: number;
	fill?: string;
	stroke?: string;
}

function SeverityCriticalIcon({
	width,
	height,
	fill,
	stroke,
}: SeverityCriticalIconProps): JSX.Element {
	return (
		<svg
			width={width}
			height={height}
			fill={fill}
			xmlns="http://www.w3.org/2000/svg"
		>
			<path
				d="M.99707.666056.99707 2.99939M.99707 5.33337H.991237M3.00293.666056 3.00293 2.99939M3.00293 5.33337H2.9971M5.00879.666056V2.99939M5.00879 5.33337H5.00296"
				stroke={stroke}
				strokeWidth="1.16667"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

SeverityCriticalIcon.defaultProps = {
	width: 6,
	height: 6,
	fill: 'none',
	stroke: '#F56C87',
};

export default SeverityCriticalIcon;
