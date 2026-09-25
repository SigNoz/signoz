/**
 * Small glyph icons for the panel-editor segmented/select controls, ported from the
 * Configure-panel design. They render at 14px and inherit `currentColor` so the
 * surrounding control can dim them when unselected and brighten them when active.
 */
export type SegmentIconName =
	| 'solid-line'
	| 'dashed-line'
	| 'fill-none'
	| 'fill-solid'
	| 'fill-gradient'
	| 'pos-bottom'
	| 'pos-right'
	| 'scale-linear'
	| 'scale-log'
	| 'interp-linear'
	| 'interp-spline'
	| 'interp-step-before'
	| 'interp-step-after';

function Svg({ children }: { children: React.ReactNode }): JSX.Element {
	return (
		<svg
			width={14}
			height={14}
			viewBox="0 0 16 16"
			fill="none"
			stroke="currentColor"
			strokeWidth={1.5}
			strokeLinecap="round"
			strokeLinejoin="round"
			style={{ flex: 'none' }}
			aria-hidden
		>
			{children}
		</svg>
	);
}

const FILLED = { fill: 'currentColor', stroke: 'none' } as const;

export function SegmentIcon({
	name,
}: {
	name: SegmentIconName;
}): JSX.Element | null {
	switch (name) {
		case 'solid-line':
			return (
				<Svg>
					<path d="M2 8 H14" />
				</Svg>
			);
		case 'dashed-line':
			return (
				<Svg>
					<path d="M2 8 H4.5" />
					<path d="M6.75 8 H9.25" />
					<path d="M11.5 8 H14" />
				</Svg>
			);
		case 'fill-none':
			return (
				<Svg>
					<path d="M2 11 L6 6 L10 9 L14 5" />
				</Svg>
			);
		case 'fill-solid':
			return (
				<Svg>
					<path
						d="M2 10.5 L6 5.5 L10 8.5 L14 4.5 V13.5 H2 Z"
						fill="currentColor"
						fillOpacity={0.85}
						stroke="none"
					/>
					<path d="M2 10.5 L6 5.5 L10 8.5 L14 4.5" />
				</Svg>
			);
		case 'fill-gradient':
			return (
				<Svg>
					<path
						d="M2 10.5 L6 5.5 L10 8.5 L14 4.5 V13.5 H2 Z"
						fill="currentColor"
						fillOpacity={0.3}
						stroke="none"
					/>
					<path d="M2 10.5 L6 5.5 L10 8.5 L14 4.5" />
				</Svg>
			);
		case 'pos-bottom':
			return (
				<Svg>
					<rect x={2} y={2.5} width={12} height={9} rx={1.2} />
					<rect x={2} y={9} width={12} height={2.5} {...FILLED} />
				</Svg>
			);
		case 'pos-right':
			return (
				<Svg>
					<rect x={2} y={2.5} width={12} height={9} rx={1.2} />
					<rect x={10.5} y={2.5} width={3.5} height={9} {...FILLED} />
				</Svg>
			);
		case 'scale-linear':
			return (
				<Svg>
					<path d="M2.5 13 L13.5 3" />
				</Svg>
			);
		case 'scale-log':
			return (
				<Svg>
					<path d="M2.5 13 C5 13, 8 4.5, 13.5 3" />
				</Svg>
			);
		case 'interp-linear':
			return (
				<Svg>
					<path d="M2 12 L6 5 L10 9 L14 4" />
				</Svg>
			);
		case 'interp-spline':
			return (
				<Svg>
					<path d="M2 12 C5 3, 9 3, 14 8" />
				</Svg>
			);
		case 'interp-step-before':
			return (
				<Svg>
					<path d="M2 6 H6 V10 H10 V4.5 H14" />
				</Svg>
			);
		case 'interp-step-after':
			return (
				<Svg>
					<path d="M2 10 H6 V5 H10 V9.5 H14" />
				</Svg>
			);
		default:
			return null;
	}
}
