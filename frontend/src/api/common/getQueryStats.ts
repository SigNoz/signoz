import getLocalStorageApi from 'api/browser/localstorage/get';
import { ENVIRONMENT } from 'constants/env';
import { LOCALSTORAGE } from 'constants/localStorage';

export interface WsDataEvent {
	read_rows: number;
	read_bytes: number;
	elapsed_ms: number;
}
interface GetQueryStatsProps {
	queryId: string;
	setData: React.Dispatch<React.SetStateAction<WsDataEvent | undefined>>;
}

export function getQueryStats(props: GetQueryStatsProps): void {
	const { queryId, setData } = props;

	const token = getLocalStorageApi(LOCALSTORAGE.AUTH_TOKEN) || '';

	// https://github.com/whatwg/websockets/issues/20 reason for not using the relative URLs
	const url = new URL(
		`/api/v3/query_progress?q=${queryId}`,
		ENVIRONMENT.wsURL ? ENVIRONMENT.wsURL : window.location.href,
	);

	url.protocol = 'wss';

	const socket = new WebSocket(url, token);

	socket.addEventListener('message', (event) => {
		try {
			const parsedData = JSON.parse(event?.data);
			setData(parsedData);
		} catch {
			setData(event?.data);
		}
	});
}
