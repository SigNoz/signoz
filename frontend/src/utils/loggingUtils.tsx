// eslint-disable-next-line import/no-extraneous-dependencies
import { SpanStatusCode, trace } from '@opentelemetry/api';
import { defaultTo } from 'lodash-es';
import { ErrorInfo } from 'react';

export function reportErrorStackTrace(error: Error, info: ErrorInfo): void {
	const tracer = trace.getTracer('Error Boundary');
	tracer.startActiveSpan('Error Boundary', (span) => {
		const stackTrace = error.stack;

		span.recordException(error);
		span.setAttribute('stackTrace', defaultTo(error.stack, ''));
		span.setAttribute('errorMessage', error.message);
		span.setStatus({
			code: SpanStatusCode.ERROR,
		});
		console.log('Logging stack trace to logging system:');
		console.log(stackTrace);
		console.log(info);
		span.end();
	});
}
