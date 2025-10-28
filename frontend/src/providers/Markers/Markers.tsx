import useUrlQuery from 'hooks/useUrlQuery';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useQuery } from 'react-query';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';

type Marker = {
	type: string;
	env: string;
	source: string;
	attr: {
		version: string;
		firstSeen: number;
		'service.name': string;
		region: string;
		spanCount: number;
	};
};

function generateMockMarkers(
	minTime: number,
	maxTime: number,
	count = 10,
): { markers: Marker[] } {
	const step = (maxTime - minTime) / count;

	const services = [
		'cart-service',
		'checkout-service',
		'inventory-service',
		'auth-service',
		'payment-service',
		'recommendation-service',
		'search-service',
		'user-service',
		'notification-service',
		'analytics-service',
	];

	const regions = [
		'us-east-1',
		'us-west-1',
		'us-east-2',
		'eu-central-1',
		'ap-southeast-1',
		'eu-west-1',
	];
	const envs = ['prod-us', 'prod-eu', 'staging', 'prod-ap'];
	const sources = ['traces', 'logs'];

	const markers: Marker[] = Array.from({ length: count }).map((_, i) => {
		const firstSeen = Math.round(minTime + i * step);
		const service = services[i % services.length];
		const env = envs[i % envs.length];
		const region = regions[i % regions.length];
		const source = sources[i % sources.length];

		return {
			type: 'deployment',
			env,
			source,
			attr: {
				version: `1.${160 + i}.0-${env.includes('prod') ? 'prod' : 'stg'}`,
				firstSeen,
				'service.name': service,
				region,
				spanCount: 100 + Math.floor(Math.random() * 150),
			},
		};
	});

	return { markers };
}

type MarkersContextValue = {
	markersData: Marker[];
	filteredMarkersData: Marker[];
	setMarkersData: (markersData: Marker[]) => void;
	shouldShowMarkers: boolean;
};

const MarkersContext = createContext<MarkersContextValue | undefined>(
	undefined,
);

export function MarkersProvider({
	children,
}: {
	children: React.ReactNode;
}): JSX.Element {
	const [markersData, setMarkersData] = useState<Marker[]>([]);
	const urlQuery = useUrlQuery();

	// CHECK LOGIC AND CREATE UTIL
	const filteredMarkersData = useMemo(() => {
		const servicesRaw = urlQuery.get('markerServices') || '';
		const typesRaw = urlQuery.get('markerTypes') || '';
		const selectedServices = servicesRaw
			.split(',')
			.map((s) => s.trim())
			.filter((s) => s.length > 0);
		const selectedTypes = typesRaw
			.split(',')
			.map((t) => t.trim())
			.filter((t) => t.length > 0);

		if (selectedServices.length === 0 && selectedTypes.length === 0) {
			return markersData;
		}

		return (markersData || []).filter((m: Marker) => {
			const typeOk = selectedTypes.includes(m?.type);
			const serviceOk = selectedServices.includes(m?.attr?.['service.name']);
			return typeOk && serviceOk;
		});
	}, [urlQuery, markersData]);

	const shouldShowMarkers = useMemo(() => !!urlQuery.get('showMarkers'), [
		urlQuery,
	]);

	console.log('*** filteredMarkersData', filteredMarkersData);

	const value = useMemo(
		() => ({
			markersData,
			filteredMarkersData,
			setMarkersData,
			shouldShowMarkers,
		}),
		[markersData, filteredMarkersData, setMarkersData, shouldShowMarkers],
	);

	return (
		<MarkersContext.Provider value={value}>{children}</MarkersContext.Provider>
	);
}

export function useMarkers(): MarkersContextValue {
	const ctx = useContext(MarkersContext);
	if (!ctx) {
		throw new Error('useMarkers must be used within a MarkersProvider');
	}
	return ctx;
}

export function useFetchMarkersData({
	isFetchEnabled,
}: {
	isFetchEnabled: boolean;
}): { loadingMarkers: boolean } {
	const { setMarkersData } = useMarkers();
	const { maxTime, minTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);
	const { data, isLoading, isFetching } = useQuery<{ markers: Marker[] }>(
		['mock-markers', minTime, maxTime],
		async () => {
			// simulate network latency without returning from the executor
			await new Promise<void>((resolve) => {
				setTimeout(resolve, 2000);
			});
			return generateMockMarkers(minTime, maxTime, 10);
		},
		{
			enabled: isFetchEnabled,
		},
	);

	useEffect(() => {
		if (data) {
			console.log('*** setting markers data', data.markers);
			setMarkersData(data.markers);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [data]);

	return {
		loadingMarkers: isLoading || isFetching,
	};
}

export default MarkersProvider;
