import { Button } from 'antd';
import getLocalStorageKey from 'api/browser/localstorage/get';
import { LiveTail } from 'api/logs/livetail';
import { LOCALSTORAGE } from 'constants/localStorage';
import React, { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { PUSH_LIVE_TAIL_EVENT, TOGGLE_LIVE_TAIL } from 'types/actions/logs';
import ILogsReducer from 'types/reducer/logs';
import { fetchEventSource } from '@microsoft/fetch-event-source';
function LogLiveTail() {
	const { liveTail } = useSelector<AppState, ILogsReducer>(
		(state) => state.logs,
	);

	const dispatch = useDispatch();

	const handleLiveTail = (toggleState) => {
		dispatch({
			type: TOGGLE_LIVE_TAIL,
			payload: toggleState,
		});
	};
	const pushLiveLog = (ev) => {
		dispatch({
			type: PUSH_LIVE_TAIL_EVENT,
			payload: {
				body: JSON.parse(ev.data)
			}
		})
	}
	const liveTailSourceRef = useRef(null);
	useEffect(() => {
		if (liveTail) {
			// console.log('Starting Live Tail');
			// const source = LiveTail();
			// liveTailSourceRef.current = source;
			// source.addEventListener(
			// 	'message',
			// 	(e) => {
			// 		console.log(e);
			// 	},
			// 	false,
			// );
			// source.onmessage = function (e) {
			// 	console.log('Event received', e)
			// dispatch({
			// 	type: PUSH_LIVE_TAIL_EVENT,
			// 	payload: {
			// 		body: JSON.parse(e.data)
			// 	}
			// })
			// };
			// source.onopen = function (event) {
			// 	console.log('open event');
			// 	console.log(event);
			// };
			// source.onerror = function (event) {
			// 	console.log('error event');
			// 	console.log(event);
			// 	source.close();
			// };
		} else if (liveTailSourceRef.current) {
			console.log('Stopping Live Tail');
			liveTailSourceRef.current?.close();
			liveTailSourceRef.current = null;
		}
	}, [liveTail]);

	return (
		<div style={{ padding: '0 0.5rem' }}>
			{liveTail ? (
				<Button onClick={() => handleLiveTail(false)}>Pause</Button>
			) : (
				<Button onClick={() => handleLiveTail(true)}>Play</Button>
			)}
		</div>
	);
}

export default LogLiveTail;
