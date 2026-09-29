import type { ReactNode } from 'react';

export type Tone = 'robin' | 'sakura' | 'forest' | 'amber';

const TONE_COLOR: Record<Tone, string> = {
	robin: 'var(--bg-robin-300)',
	sakura: 'var(--bg-sakura-400)',
	forest: 'var(--bg-forest-400)',
	amber: 'var(--bg-amber-400)',
};

function TileSvg({
	tone,
	children,
}: {
	tone: Tone;
	children: ReactNode;
}): JSX.Element {
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
			style={{ color: TONE_COLOR[tone], flex: 'none' }}
			aria-hidden
		>
			{children}
		</svg>
	);
}

export default TileSvg;
