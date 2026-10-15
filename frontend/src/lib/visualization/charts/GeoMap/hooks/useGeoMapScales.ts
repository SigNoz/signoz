import { useCallback, useMemo } from 'react';
import type { ColorRampResolver } from 'lib/visualization/colorRamp/colorScale';

import { GeoMapColors, GeoMapDatum } from '../types';
import {
	bubbleSizeOf,
	createGeoMapColorResolver,
	createRadiusScale,
} from '../utils/scales';

interface GeoMapScales {
	resolver: ColorRampResolver;
	valueByCode: Map<string, GeoMapDatum>;
	/** What each bubble is sized by; codes without one draw no bubble. */
	sizeByCode: Map<string, number>;
	radiusFor: (size: number) => number;
	fillFor: (code: string) => string | null;
}

/** Everything the layers derive from the data: colours, radii, ranks, lookup. */
export function useGeoMapScales(
	data: GeoMapDatum[],
	colors: GeoMapColors,
	bubbleRadius: [number, number],
	isDarkMode: boolean,
	hasSizeMetric = false,
): GeoMapScales {
	const resolver = useMemo(
		() => createGeoMapColorResolver(data, colors, isDarkMode),
		[data, colors, isDarkMode],
	);
	const valueByCode = useMemo(
		() => new Map(data.map((datum) => [datum.code, datum])),
		[data],
	);
	const sizeByCode = useMemo(() => {
		const sizes = new Map<string, number>();
		data.forEach((datum) => {
			const size = bubbleSizeOf(datum, hasSizeMetric);
			if (size !== null) {
				sizes.set(datum.code, size);
			}
		});
		return sizes;
	}, [data, hasSizeMetric]);
	const radiusFor = useMemo(
		() => createRadiusScale([...sizeByCode.values()], bubbleRadius),
		[sizeByCode, bubbleRadius],
	);
	const fillFor = useCallback(
		(code: string): string | null => {
			const datum = valueByCode.get(code);
			if (!datum) {
				return null;
			}
			return datum.color ?? resolver.colorFor(datum.value);
		},
		[valueByCode, resolver],
	);
	return { resolver, valueByCode, sizeByCode, radiusFor, fillFor };
}
