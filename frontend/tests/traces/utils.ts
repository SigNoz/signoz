import { Page } from '@playwright/test';

import attributeKeyServiceNameSuccessResponse from '../fixtures/api/traces/attributeKeysServiceName200.json';
import attributeKeyNameSuccessResponse from '../fixtures/api/traces/attributeKeysName200.json';
import attributeKeyDurationNanoSuccessResponse from '../fixtures/api/traces/attributeKeysDurationNano200.json';
import attributeKeyResponseStatusCodeSuccessResponse from '../fixtures/api/traces/attributeKeysResponseStatusCode200.json';
import attributeKeyHttpMethodSuccessResponse from '../fixtures/api/traces/attributeKeysHttpMethod200.json';
import traceExplorerViewsSuccessResponse from '../fixtures/api/traces/traceExplorerViews200.json';
import traceExplorerViewsPostSuccessResponse from '../fixtures/api/traces/traceExplorerViewPost200.json';
import { JsonApplicationType } from '../fixtures/constant';

export const queryRangeApiEndpoint = 'query_range';
export const attributeKeysApiEndpoint = 'autocomplete/attribute_keys';
export const traceExplorerViewsGetEndpoint = 'explorer/views?sourcePage=traces';
export const traceExplorerViewsPostEndpoint = 'explorer/views';

export const newExplorerCtaID = 'newExplorerCTA';
export const serviceAttributeID = 'serviceName';
export const httpMethodAttributeID = 'httpMethod';
export const traceTabID = 'rc-tabs-0-tab-trace';
export const traceRowTraceTabID = 'trace-id';
export const tableViewTabID = 'rc-tabs-0-tab-table';
export const saveNewViewID = 'traces-save-view-action';
export const saveNewViewWithNameID = 'save-view-name-action-button';

const DefaultAttributesExplorerPage = [
	'serviceName',
	'name',
	'durationNano',
	'httpMethod',
	'responseStatusCode',
];

export const tracesExplorerQueryData = async (
	page: Page,
	response: any,
): Promise<void> => {
	await page.route(`**/${queryRangeApiEndpoint}`, (route) =>
		route.fulfill({
			status: 200,
			contentType: JsonApplicationType,
			json: response,
		}),
	);
};

export const tracesExplorerViewsData = async (page: Page): Promise<void> => {
	await page.route(`**/${traceExplorerViewsGetEndpoint}`, (route) =>
		route.fulfill({
			status: 200,
			contentType: JsonApplicationType,
			json: traceExplorerViewsSuccessResponse,
		}),
	);
};

export const tracesExplorerViewsPostData = async (
	page: Page,
): Promise<void> => {
	await page.route(`**/${traceExplorerViewsPostEndpoint}`, (route) =>
		route.fulfill({
			status: 200,
			contentType: JsonApplicationType,
			json: traceExplorerViewsPostSuccessResponse,
		}),
	);
};

function getAttributeResponseBySearchTerm(
	searchTerm: string,
): Record<string, unknown> {
	if (searchTerm) {
		switch (searchTerm) {
			case 'sericeName':
				return attributeKeyServiceNameSuccessResponse;

			case 'name':
				return attributeKeyNameSuccessResponse;

			case 'durationNano':
				return attributeKeyDurationNanoSuccessResponse;

			case 'httpMethod':
				return attributeKeyResponseStatusCodeSuccessResponse;

			case 'responseStatusCode':
				return attributeKeyHttpMethodSuccessResponse;
			default:
				return {};
		}
	}

	return {};
}

export const getAttributeKeysData = async (
	page: Page,
	searchTerm: string,
): Promise<void> => {
	await page.route(
		`**/${attributeKeysApiEndpoint}?**searchText=${searchTerm}**`,
		(route) =>
			route.fulfill({
				status: 200,
				json: getAttributeResponseBySearchTerm(searchTerm),
			}),
	);
};

export const defaultAttributeKeysData = async (page: Page): Promise<void> => {
	await Promise.all([
		...DefaultAttributesExplorerPage.map((att) =>
			getAttributeKeysData(page, att),
		),
	]);
};
