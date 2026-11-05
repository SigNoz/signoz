import {
	useCallback,
	useEffect,
	useMemo,
	useState,
	type MouseEvent as ReactMouseEvent,
	type RefObject,
} from 'react';
import { useTooltip } from '@visx/tooltip';

import { PieChartProps, PieSlice } from 'lib/visualization/charts/types';
import { PieTooltipData } from 'lib/visualization/charts/Pie/types';
import { getSliceDisplayLabel } from 'lib/visualization/charts/Pie/utils/slices';

// Keeps the cursor off the tooltip so it never steals the hover.
const TOOLTIP_CURSOR_OFFSET = 12;

interface UsePieTooltipArgs {
	/** The drawn slices, Other included. */
	slices: PieSlice[];
	/** The chart's root: a click on its own arcs resolves the pin, one anywhere else unpins. */
	chartRef: RefObject<HTMLElement>;
	formatValue: (value: number) => string;
	setFocusedKey: (key: string | null) => void;
	onSliceClick: PieChartProps['onSliceClick'];
}

interface UsePieTooltipResult {
	tooltipOpen: boolean;
	tooltipTop?: number;
	tooltipLeft?: number;
	tooltipData?: PieTooltipData;
	isPinned: boolean;
	unpin: () => void;
	handleSliceHover: (
		slice: PieSlice,
		event: ReactMouseEvent<SVGGElement>,
	) => void;
	handleSliceLeave: () => void;
	handleSliceClick: (slice: PieSlice, event: ReactMouseEvent) => void;
	handleMemberClick: (index: number, event: ReactMouseEvent) => void;
}

/**
 * The Pie tooltip: follows the cursor over an arc, and pins on a grouped slice's click so its
 * members can be drilled into. Esc or a click outside unpins.
 */
export function usePieTooltip({
	slices,
	chartRef,
	formatValue,
	setFocusedKey,
	onSliceClick,
}: UsePieTooltipArgs): UsePieTooltipResult {
	const {
		tooltipOpen,
		tooltipLeft,
		tooltipTop,
		tooltipData,
		hideTooltip,
		showTooltip,
	} = useTooltip<PieTooltipData>();

	// A grouped slice's click pins its tooltip so its members can be drilled into.
	const [pinnedSlice, setPinnedSlice] = useState<PieSlice | null>(null);

	const unpin = useCallback((): void => {
		setPinnedSlice(null);
		hideTooltip();
		setFocusedKey(null);
	}, [hideTooltip, setFocusedKey]);

	// New data replaces the pinned slice, whose members may no longer be drawn.
	useEffect(() => {
		if (pinnedSlice && !slices.includes(pinnedSlice)) {
			unpin();
		}
	}, [slices, pinnedSlice, unpin]);

	useEffect(() => {
		if (!pinnedSlice) {
			return undefined;
		}
		const onPointerDown = (event: PointerEvent): void => {
			const target = event.target as Element | null;
			// This chart's arc clicks resolve the pin themselves (see handleSliceClick).
			const isOwnArc =
				!!target?.closest('[data-pie-arc]') && !!chartRef.current?.contains(target);
			if (isOwnArc || target?.closest('[data-pie-tooltip]')) {
				return;
			}
			unpin();
		};
		const onKeyDown = (event: KeyboardEvent): void => {
			if (event.key === 'Escape') {
				unpin();
			}
		};
		document.addEventListener('pointerdown', onPointerDown);
		document.addEventListener('keydown', onKeyDown);
		return (): void => {
			document.removeEventListener('pointerdown', onPointerDown);
			document.removeEventListener('keydown', onKeyDown);
		};
	}, [pinnedSlice, unpin, chartRef]);

	// Built once per data change, not on every mouse move.
	const tooltipDataBySlice = useMemo(
		() =>
			new Map<PieSlice, PieTooltipData>(
				slices.map((slice) => [
					slice,
					{
						slice: {
							label: getSliceDisplayLabel(slice),
							value: slice.value,
							tooltipValue: formatValue(slice.value),
							color: slice.color,
							isActive: true,
						},
						members: slice.members?.map((member) => ({
							label: member.label,
							value: member.value,
							tooltipValue: formatValue(member.value),
							color: member.color,
							isActive: false,
						})),
					},
				]),
			),
		[slices, formatValue],
	);

	const handleSliceHover = useCallback(
		(slice: PieSlice, event: ReactMouseEvent<SVGGElement>): void => {
			if (pinnedSlice) {
				return;
			}
			const svgRect = event.currentTarget.ownerSVGElement?.getBoundingClientRect();
			showTooltip({
				tooltipData: tooltipDataBySlice.get(slice),
				tooltipTop: event.clientY - (svgRect?.top ?? 0) + TOOLTIP_CURSOR_OFFSET,
				tooltipLeft: event.clientX - (svgRect?.left ?? 0) + TOOLTIP_CURSOR_OFFSET,
			});
			setFocusedKey(slice.label);
		},
		[pinnedSlice, showTooltip, setFocusedKey, tooltipDataBySlice],
	);

	const handleSliceLeave = useCallback((): void => {
		if (pinnedSlice) {
			return;
		}
		hideTooltip();
		setFocusedKey(null);
	}, [pinnedSlice, hideTooltip, setFocusedKey]);

	const handleSliceClick = useCallback(
		(slice: PieSlice, event: ReactMouseEvent): void => {
			if (slice.members) {
				if (pinnedSlice === slice) {
					unpin();
				} else {
					setPinnedSlice(slice);
				}
				return;
			}
			if (pinnedSlice) {
				unpin();
			}
			onSliceClick?.(slice, { x: event.clientX, y: event.clientY });
		},
		[pinnedSlice, unpin, onSliceClick],
	);

	const handleMemberClick = useCallback(
		(index: number, event: ReactMouseEvent): void => {
			const member = pinnedSlice?.members?.[index];
			const tooltipRect = (event.currentTarget as Element)
				.closest('[data-pie-tooltip]')
				?.getBoundingClientRect();
			unpin();
			if (member) {
				onSliceClick?.(member, {
					x: tooltipRect?.left ?? event.clientX,
					y: tooltipRect?.top ?? event.clientY,
				});
			}
		},
		[pinnedSlice, unpin, onSliceClick],
	);

	return {
		tooltipOpen,
		tooltipTop,
		tooltipLeft,
		tooltipData,
		isPinned: !!pinnedSlice,
		unpin,
		handleSliceHover,
		handleSliceLeave,
		handleSliceClick,
		handleMemberClick,
	};
}
