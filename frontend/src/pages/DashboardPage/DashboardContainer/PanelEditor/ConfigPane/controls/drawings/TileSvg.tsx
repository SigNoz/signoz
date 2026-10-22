import type { ReactNode } from 'react';

function TileSvg({ children }: { children: ReactNode }): JSX.Element {
	return (
		<svg
			width={64}
			height={24}
			viewBox="0 0 64 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={2.4}
			strokeLinecap="round"
			strokeLinejoin="round"
			style={{ flex: 'none' }}
			aria-hidden
		>
			{children}
		</svg>
	);
}

export default TileSvg;
