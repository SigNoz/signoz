import { FlamegraphSpan } from 'types/api/trace/getTraceFlamegraph';

import { VisualLayout } from './computeVisualLayout';

export interface LayoutWorkerRequest {
	type: 'compute';
	requestId: number;
	spans: FlamegraphSpan[][];
}

export type LayoutWorkerResponse =
	| { type: 'result'; requestId: number; layout: VisualLayout }
	| { type: 'error'; requestId: number; message: string };
