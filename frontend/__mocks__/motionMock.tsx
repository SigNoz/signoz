// oxlint-disable-next-line no-restricted-imports
import * as React from 'react';

// In jsdom, AnimatePresence from motion/react keeps children in DOM during exit
// animations (awaiting rAF-driven completion that never fully runs in jsdom).
// This mock makes AnimatePresence render children immediately and makes motion.*
// elements render as their plain HTML equivalents without animation side-effects.
//
// IMPORTANT: motion component references are cached so React sees a stable
// component identity across re-renders and does not enter an infinite remount loop.

const MOTION_PROPS_TO_STRIP = new Set([
	'initial',
	'animate',
	'exit',
	'variants',
	'transition',
	'whileHover',
	'whileTap',
	'whileFocus',
	'whileInView',
	'layout',
	'layoutId',
	'onAnimationStart',
	'onAnimationComplete',
]);

const cache = new Map<string, React.ComponentType>();

function getMotionComponent(tag: string): React.ComponentType {
	if (!cache.has(tag)) {
		const Component = React.forwardRef<HTMLElement, Record<string, unknown>>(
			(props, ref) => {
				const domProps: Record<string, unknown> = {};
				for (const [k, v] of Object.entries(props)) {
					if (!MOTION_PROPS_TO_STRIP.has(k)) {
						domProps[k] = v;
					}
				}
				return React.createElement(tag, { ...domProps, ref });
			},
		);
		Component.displayName = `motion.${tag}`;
		cache.set(tag, Component as unknown as React.ComponentType);
	}
	return cache.get(tag) as React.ComponentType;
}

const motionHandler: ProxyHandler<Record<string, React.ComponentType>> = {
	get(_target, prop: string) {
		return getMotionComponent(prop);
	},
};

export const AnimatePresence: React.FC<{
	children?: React.ReactNode;
	mode?: string;
}> = ({ children }) => React.createElement(React.Fragment, null, children);

export const motion = new Proxy(
	{} as Record<string, React.ComponentType>,
	motionHandler,
);

export const useAnimation = (): Record<string, unknown> => ({
	start: (): unknown => Promise.resolve(),
	stop: (): unknown => undefined,
	set: (): unknown => undefined,
});

export const useMotionValue = (
	initial: unknown,
): { get: () => unknown; set: () => void } => ({
	get: (): unknown => initial,
	set: (): unknown => undefined,
});

export const useTransform = (): { get: () => number } => ({
	get: (): number => 0,
});

export const useSpring = (v: unknown): unknown => v;

export const useScroll = (): { scrollY: { get: () => number } } => ({
	scrollY: { get: (): number => 0 },
});

export default { motion, AnimatePresence };
