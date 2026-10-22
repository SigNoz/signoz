import { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';

// Serve Monaco's workers from our own origin instead of letting @monaco-editor/loader
// fetch them from cdn.jsdelivr.net at runtime. The CDN default breaks the editor in
// air-gapped/on-prem installs, CDN-blocking corporate networks, and regions where
// jsdelivr is unreachable. Ref: engineering-pod#5871, SIGNOZ-UI-5G0.
self.MonacoEnvironment = {
	getWorker(_workerId: string, label: string): Worker {
		if (label === 'json') {
			return new JsonWorker(); // JSON language service
		}
		// SigNoz editors use JSON + a hand-registered ClickHouse tokenizer (no worker),
		// so the base editor worker covers everything else.
		return new EditorWorker(); // base worker — sql, yaml, plaintext etc.
	},
};

loader.config({ monaco });
