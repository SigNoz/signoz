import type { ReactNode } from 'react';

function SketchSvg({ children }: { children: ReactNode }): JSX.Element {
	return (
		<svg
			width={40}
			height={22}
			viewBox="0 0 40 22"
			fill="none"
			stroke="var(--l3-foreground)"
			strokeWidth={1.8}
			strokeLinecap="round"
			strokeLinejoin="round"
			style={{ flex: 'none' }}
			aria-hidden
		>
			{children}
		</svg>
	);
}

export default SketchSvg;
