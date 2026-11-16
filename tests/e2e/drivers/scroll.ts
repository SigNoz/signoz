import { expect, type Locator } from '@playwright/test';

const MAX_TURNS = 20;

interface Turn {
	x: number;
	y: number;
	deltaX: number;
	deltaY: number;
}

/**
 * Scrolls `target` to the middle of its scroll container with the mouse wheel,
 * as a user would. Unlike `scrollIntoView`, the wheel cannot move an
 * `overflow: hidden` box, so a layout that clips instead of scrolling fails here.
 */
export async function wheelTo(target: Locator): Promise<void> {
	const page = target.page();
	const position = (): Promise<string> =>
		target.evaluate((element) => {
			const { top, left } = element.getBoundingClientRect();
			return `${top},${left}`;
		});
	for (let turn = 0; turn < MAX_TURNS; turn += 1) {
		// eslint-disable-next-line no-await-in-loop
		const next = await target.evaluate(nextTurn);
		if (!next) {
			break;
		}
		// eslint-disable-next-line no-await-in-loop
		const before = await position();
		// eslint-disable-next-line no-await-in-loop
		await page.mouse.move(next.x, next.y);
		// eslint-disable-next-line no-await-in-loop
		await page.mouse.wheel(next.deltaX, next.deltaY);
		// eslint-disable-next-line no-await-in-loop
		await expect
			.poll(position, {
				message:
					'the wheel did not move the target: a container clips it instead of scrolling',
				timeout: 2_000,
			})
			.not.toBe(before);
		// eslint-disable-next-line no-await-in-loop
		await target.evaluate(settled);
	}
	await expect(target).toBeInViewport();
}

/**
 * Where to wheel and by how much, or null once the target is in view. The wheel
 * goes over the innermost clipping ancestor that is itself on screen, so nested
 * scrollers are brought in from the outside.
 */
function nextTurn(element: Element): Turn | null {
	interface Rect {
		top: number;
		bottom: number;
		left: number;
		right: number;
	}
	const clip = (a: Rect, b: Rect): Rect => ({
		top: Math.max(a.top, b.top),
		bottom: Math.min(a.bottom, b.bottom),
		left: Math.max(a.left, b.left),
		right: Math.min(a.right, b.right),
	});

	const clippers: Element[] = [];
	for (let node = element.parentElement; node; node = node.parentElement) {
		const style = getComputedStyle(node);
		if (style.overflowX !== 'visible' || style.overflowY !== 'visible') {
			clippers.push(node);
		}
	}

	let visible: Rect = {
		top: 0,
		bottom: window.innerHeight,
		left: 0,
		right: window.innerWidth,
	};
	let region = visible;
	for (const node of clippers.reverse()) {
		visible = clip(visible, node.getBoundingClientRect());
		if (visible.bottom <= visible.top || visible.right <= visible.left) {
			break;
		}
		region = visible;
	}

	const rect = element.getBoundingClientRect();
	// A target larger than the region is in view once it covers it.
	const within = (
		start: number,
		end: number,
		from: number,
		to: number,
	): boolean =>
		end - start <= to - from
			? start >= from && end <= to
			: start <= from && end >= to;
	const inX = within(rect.left, rect.right, region.left, region.right);
	const inY = within(rect.top, rect.bottom, region.top, region.bottom);
	const x = (region.left + region.right) / 2;
	const y = (region.top + region.bottom) / 2;
	const deltaX = (rect.left + rect.right) / 2 - x;
	const deltaY = (rect.top + rect.bottom) / 2 - y;

	// A sticky header overlays the region rather than clipping it, so a target
	// inside the region can still sit under one; centring it clears the edges.
	if (inX && inY) {
		const hit = document.elementFromPoint(
			Math.max(rect.left, region.left) +
				Math.min(rect.width, region.right - region.left) / 2,
			Math.max(rect.top, region.top) +
				Math.min(rect.height, region.bottom - region.top) / 2,
		);
		const covered = !hit || !element.contains(hit);
		if (!covered || (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1)) {
			return null;
		}
		return { x, y, deltaX, deltaY };
	}

	return { x, y, deltaX: inX ? 0 : deltaX, deltaY: inY ? 0 : deltaY };
}

/** Resolves once the target holds still for two frames, as smooth scrolling ends. */
function settled(element: Element): Promise<void> {
	return new Promise((resolve) => {
		let last = '';
		let still = 0;
		const deadline = performance.now() + 1_000;
		const tick = (): void => {
			const { top, left } = element.getBoundingClientRect();
			const now = `${top},${left}`;
			still = now === last ? still + 1 : 0;
			last = now;
			if (still >= 2 || performance.now() > deadline) {
				resolve();
			} else {
				requestAnimationFrame(tick);
			}
		};
		requestAnimationFrame(tick);
	});
}
