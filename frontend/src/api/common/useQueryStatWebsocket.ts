import getLocalStorageApi from 'api/browser/localstorage/get';
import { LOCALSTORAGE } from 'constants/localStorage';
import { useState } from 'react';

interface IUseQueryStatWebsocketProps {
	queryId: string;
	enabled: boolean;
}

interface IUseQueryStatWebsocket {
	data: any;
}

const useQueryStatWebsocket = (
	props: IUseQueryStatWebsocketProps,
): IUseQueryStatWebsocket => {
	const { queryId, enabled } = props;
	console.log(queryId, enabled);
	const [data, setData] = useState<any>();

	setTimeout(() => {
		const token = getLocalStorageApi(LOCALSTORAGE.AUTH_TOKEN) || '';
		const socket = new WebSocket(
			`ws://localhost:8080/api/v3/query_progress?q=${queryId}`,
			token,
		);

		socket.addEventListener('message', (event) => {
			setData(event.data);
			console.log('Progress Message from server ', event);
		});

		socket.addEventListener('close', (event) => {
			console.log('Progress connection closed by server', event);
		});
	}, 500);

	return {
		data,
	};
};

export default useQueryStatWebsocket;
