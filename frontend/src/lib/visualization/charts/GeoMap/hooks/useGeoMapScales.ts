import { useCallback, useMemo } from 'react';
import type { ColorRampResolver } from 'lib/visualization/colorRamp/colorScale';

import { GeoMapColors, GeoMapDatum } from '../types';
import {
	createGeoMapColorResolver,
	createRadiusScale,
	GeoMapRank,
	rankData,
} from '../utils/scales';

interface GeoMapScales {
	resolver: ColorRampResolver;
	valueByCode: Map<string, GeoMapDatum>;
	ranks: Map<string, GeoMapRank>;
	radiusFor: (value: number) => number;
	fillFor: (code: string) => string | null;
}

/** Everything the layers derive from the data: colours, radii, ranks, lookup. */
export function useGeoMapScales(
	data: GeoMapDatum[],
	colors: GeoMapColors,
	bubbleRadius: [number, number],
	isDarkMode: boolean,
): GeoMapScales {
	const resolver = useMemo(
		() => createGeoMapColorResolver(data, colors, isDarkMode),
		[data, colors, isDarkMode],
	);
	const valueByCode = useMemo(
		() => new Map(data.map((datum) => [datum.code, datum])),
		[data],
	);
	const ranks = useMemo(() => rankData(data), [data]);
	const radiusFor = useMemo(
		() => createRadiusScale(data, bubbleRadius),
		[data, bubbleRadius],
	);
	const fillFor = useCallback(
		(code: string): string | null => {
			const datum = valueByCode.get(code);
			return datum ? resolver.colorFor(datum.value) : null;
		},
		[valueByCode, resolver],
	);
	return { resolver, valueByCode, ranks, radiusFor, fillFor };
}
