import type { ReactNode } from 'react';

function LegendFrame({ children }: { children: ReactNode }): JSX.Element {
	return (
		<svg
			width={56}
			height={30}
			viewBox="0 0 56 30"
			fill="none"
			strokeLinecap="round"
			style={{ flex: 'none' }}
			aria-hidden
		>
			<rect
				x={1}
				y={1}
				width={54}
				height={28}
				rx={2}
				stroke="var(--l3-border)"
				strokeWidth={1.4}
			/>
			{children}
		</svg>
	);
}

export default LegendFrame;
