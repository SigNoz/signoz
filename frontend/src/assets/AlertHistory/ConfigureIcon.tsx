interface ConfigureIconProps {
	width?: number;
	height?: number;
	color?: string;
}

function ConfigureIcon({
	width,
	height,
	color,
}: ConfigureIconProps): JSX.Element {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width={width}
			height={height}
			fill="none"
		>
			<path
				stroke={color}
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth="1.333"
				d="M9.71 4.745a.576.576 0 000 .806l.922.922a.576.576 0 00.806 0l2.171-2.171a3.455 3.455 0 01-4.572 4.572l-3.98 3.98a1.222 1.222 0 11-1.727-1.728l3.98-3.98a3.455 3.455 0 014.572-4.572L9.717 4.739l-.006.006z"
			/>
			<path
				stroke={color}
				strokeLinecap="round"
				strokeWidth="1.333"
				d="M4 7L2.527 5.566a1.333 1.333 0 01-.013-1.898l.81-.81a1.333 1.333 0 011.991.119L5.333 3m5.417 7.988l1.179 1.178m0 0l-.138.138a.833.833 0 00.387 1.397v0a.833.833 0 00.792-.219l.446-.446a.833.833 0 00.176-.917v0a.833.833 0 00-1.355-.261l-.308.308z"
			/>
		</svg>
	);
}

ConfigureIcon.defaultProps = {
	width: 16,
	height: 16,
	color: 'currentColor',
};
export default ConfigureIcon;
