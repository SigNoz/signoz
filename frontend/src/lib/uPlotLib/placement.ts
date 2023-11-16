/* eslint-disable radix */
/* eslint-disable guard-for-in */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-var */
/* eslint-disable vars-on-top */
/* eslint-disable func-style */
/* eslint-disable no-void */
/* eslint-disable sonarjs/cognitive-complexity */
/* eslint-disable func-names */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable no-param-reassign */
/* eslint-disable no-sequences */
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck

// https://tobyzerner.github.io/placement.js/dist/index.js

export const placement = (function () {
	const e = {
		size: ['height', 'width'],
		clientSize: ['clientHeight', 'clientWidth'],
		offsetSize: ['offsetHeight', 'offsetWidth'],
		maxSize: ['maxHeight', 'maxWidth'],
		before: ['top', 'left'],
		marginBefore: ['marginTop', 'marginLeft'],
		after: ['bottom', 'right'],
		marginAfter: ['marginBottom', 'marginRight'],
		scrollOffset: ['pageYOffset', 'pageXOffset'],
	};
	function t(e) {
		return { top: e.top, bottom: e.bottom, left: e.left, right: e.right };
	}
	return function (o, r, f, a, i) {
		void 0 === f && (f = 'bottom'),
			void 0 === a && (a = 'center'),
			void 0 === i && (i = {}),
			(r instanceof Element || r instanceof Range) &&
				(r = t(r.getBoundingClientRect()));
		const n = {
			top: r.bottom,
			bottom: r.top,
			left: r.right,
			right: r.left,
			...r,
		};
		const s = {
			top: 0,
			left: 0,
			bottom: window.innerHeight,
			right: window.innerWidth,
		};
		i.bound &&
			((i.bound instanceof Element || i.bound instanceof Range) &&
				(i.bound = t(i.bound.getBoundingClientRect())),
			Object.assign(s, i.bound));
		const l = getComputedStyle(o);
		const m = {};
		const b = {};
		for (const g in e)
			(m[g] = e[g][f === 'top' || f === 'bottom' ? 0 : 1]),
				(b[g] = e[g][f === 'top' || f === 'bottom' ? 1 : 0]);
		(o.style.position = 'absolute'),
			(o.style.maxWidth = ''),
			(o.style.maxHeight = '');
		const d = parseInt(l[b.marginBefore]);
		const c = parseInt(l[b.marginAfter]);
		const u = d + c;
		const p = s[b.after] - s[b.before] - u;
		const h = parseInt(l[b.maxSize]);
		(!h || p < h) && (o.style[b.maxSize] = `${p}px`);
		const x = parseInt(l[m.marginBefore]) + parseInt(l[m.marginAfter]);
		const y = n[m.before] - s[m.before] - x;
		const z = s[m.after] - n[m.after] - x;
		((f === m.before && o[m.offsetSize] > y) ||
			(f === m.after && o[m.offsetSize] > z)) &&
			(f = y > z ? m.before : m.after);
		const S = f === m.before ? y : z;
		const v = parseInt(l[m.maxSize]);
		(!v || S < v) && (o.style[m.maxSize] = `${S}px`);
		const w = window[m.scrollOffset];
		const O = function (e) {
			return Math.max(s[m.before], Math.min(e, s[m.after] - o[m.offsetSize] - x));
		};
		f === m.before
			? ((o.style[m.before] = `${w + O(n[m.before] - o[m.offsetSize] - x)}px`),
			  (o.style[m.after] = 'auto'))
			: ((o.style[m.before] = `${w + O(n[m.after])}px`),
			  (o.style[m.after] = 'auto'));
		const B = window[b.scrollOffset];
		const I = function (e) {
			return Math.max(s[b.before], Math.min(e, s[b.after] - o[b.offsetSize] - u));
		};
		switch (a) {
			case 'start':
				(o.style[b.before] = `${B + I(n[b.before] - d)}px`),
					(o.style[b.after] = 'auto');
				break;
			case 'end':
				(o.style[b.before] = 'auto'),
					(o.style[b.after] = `${
						B + I(document.documentElement[b.clientSize] - n[b.after] - c)
					}px`);
				break;
			default:
				var H = n[b.after] - n[b.before];
				(o.style[b.before] = `${
					B + I(n[b.before] + H / 2 - o[b.offsetSize] / 2 - d)
				}px`),
					(o.style[b.after] = 'auto');
		}
		(o.dataset.side = f), (o.dataset.align = a);
	};
})();
