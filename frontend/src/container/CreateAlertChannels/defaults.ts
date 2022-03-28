import { PagerChannel } from './config';

export const PagerInitialConfig: Partial<PagerChannel> = {
	description: '{{ template "pagerduty.default.description" .}}',
	severity: 'high',
	client: '{{ template "pagerduty.default.client" . }}',
	client_url: '{{ template "pagerduty.default.clientURL" . }}',
};
