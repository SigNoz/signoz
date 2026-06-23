/// <reference lib="webworker" />
import { computeVisualLayout } from './computeVisualLayout';
import {
	LayoutWorkerRequest,
	LayoutWorkerResponse,
} from './visualLayoutWorkerTypes';

self.onmessage = (event: MessageEvent<LayoutWorkerRequest>): void => {
	const { requestId, spans } = event.data;
	try {
		const layout = computeVisualLayout(spans);
		const response: LayoutWorkerResponse = {
			type: 'result',
			requestId,
			layout,
		};
		self.postMessage(response);
	} catch (err) {
		const response: LayoutWorkerResponse = {
			type: 'error',
			requestId,
			message: String(err),
		};
		self.postMessage(response);
	}
};
