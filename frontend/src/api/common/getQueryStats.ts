import getLocalStorageApi from 'api/browser/localstorage/get';
import { ENVIRONMENT } from 'constants/env';
import { LOCALSTORAGE } from 'constants/localStorage';
import { isEmpty } from 'lodash-es';

export interface WsDataEvent {
	read_rows: number;
	read_bytes: number;
	elapsed_ms: number;
}
interface GetQueryStatsProps {
	queryId: string;
	setData: React.Dispatch<React.SetStateAction<WsDataEvent | undefined>>;
}

function getURL(baseURL: string, queryId: string): URL | string {
	if (baseURL && !isEmpty(baseURL)) {
		return `${baseURL}/ws/query_progress?q=${queryId}`;
	}
	const url = new URL(`/ws/query_progress?q=${queryId}`, window.location.href);

	if (window.location.protocol === 'http:') {
		url.protocol = 'ws';
	} else {
		url.protocol = 'wss';
	}

	return url;
}

export function getQueryStats(props: GetQueryStatsProps): void {
	const { queryId, setData } = props;

	const token = getLocalStorageApi(LOCALSTORAGE.AUTH_TOKEN) || '';

	// https://github.com/whatwg/websockets/issues/20 reason for not using the relative URLs
	const url = getURL(ENVIRONMENT.wsURL, queryId);

	const socket = new WebSocket(url, token);

	socket.addEventListener('message', (event) => {
		try {
			const parsedData = JSON.parse(event?.data);
			setData(parsedData);
		} catch {
			setData(event?.data);
		}
	});

	socket.addEventListener('error', (event) => {
		console.error(event);
	});

	socket.addEventListener('close', (event) => {
		// 1000 is a normal closure status code
		if (event.code !== 1000) {
			console.error('WebSocket closed with error:', event);
		} else {
			console.error('WebSocket closed normally.');
		}
	});
}
