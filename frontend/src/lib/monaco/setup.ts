import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js';
import * as jsonContribution from 'monaco-editor/esm/vs/language/json/monaco.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/sql/sql.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/yaml/yaml.contribution.js';
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
		// SigNoz editors use JSON, SQL and YAML. Their tokenizers run on the main thread,
		// so the base editor worker covers the rest (word suggestions, links).
		return new EditorWorker(); // base worker: sql, yaml, plaintext etc.
	},
};

// The `monaco-editor` entry exposes JSON this way; the role editor reads `languages.json`.
Object.assign(monaco.languages, { json: jsonContribution });

export { monaco };
