import type { Completion } from '@codemirror/autocomplete';
import type { TelemetrytypesTelemetryFieldKeyDTO } from 'api/generated/services/sigNoz.schemas';
import { DataSource } from 'types/common/queryBuilder';

const CALCULATED_TRACE_FIELD_DESCRIPTIONS: Record<string, string> = {
	response_status_code:
		'Response status from http.status_code, http.response.status_code, rpc.grpc.status_code, or rpc.jsonrpc.error_code; stored as a string.',
	http_url: 'Full request URL from http.url or url.full.',
	external_http_url:
		'Client-span hostname from the request URL; uses the original value if URL parsing fails.',
	http_method: 'Request method from http.method or http.request.method.',
	external_http_method: 'Request method for client spans only.',
	http_host:
		'Host or address from host, server, client, or request-header attributes.',
	db_name: 'Database name from db.name or db.namespace.',
	db_operation: 'Database operation from db.operation or db.operation.name.',
	has_error:
		'Whether the span status indicates an error, independent of span attributes.',
	is_remote: 'Whether the span is remote.',
};

export function getCalculatedTraceFieldInfo(
	completion: Completion,
	dataSource: DataSource,
): Completion['info'] {
	const { fieldContext, description: apiDescription } =
		completion as Completion &
			Pick<TelemetrytypesTelemetryFieldKeyDTO, 'fieldContext' | 'description'>;
	if (dataSource !== DataSource.TRACES || fieldContext !== 'span') {
		return completion.info;
	}

	const fieldName = completion.label.startsWith('span.')
		? completion.label.slice('span.'.length)
		: completion.label;
	if (
		!Object.prototype.hasOwnProperty.call(
			CALCULATED_TRACE_FIELD_DESCRIPTIONS,
			fieldName,
		)
	) {
		return completion.info;
	}

	const descriptionText =
		apiDescription
			?.replace(
				/\s*Learn more \[here\]\(https:\/\/signoz\.io\/docs\/traces-management\/guides\/derived-fields-spans\/#\w+\)\.?$/,
				'',
			)
			.trim() || CALCULATED_TRACE_FIELD_DESCRIPTIONS[fieldName];

	return (): HTMLElement => {
		const container = document.createElement('div');
		container.setAttribute('data-testid', 'calculated-trace-field-info');

		const description = document.createElement('p');
		description.textContent = descriptionText;

		const link = document.createElement('a');
		link.setAttribute('data-testid', 'calculated-trace-field-docs');
		link.href = `https://signoz.io/docs/traces-management/guides/derived-fields-spans/#${fieldName}`;
		link.textContent = 'Field documentation';
		link.target = '_blank';
		link.rel = 'noopener noreferrer';

		container.append(description, link);
		return container;
	};
}
