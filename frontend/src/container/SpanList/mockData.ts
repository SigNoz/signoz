import { SpanDataRow } from './types';

export const mockEntrySpanData: SpanDataRow[] = [
	{
		data: {
			duration_nano: 3878813,
			http_method: '',
			// eslint-disable-next-line sonarjs/no-duplicate-string
			name: 'CurrencyService/Convert',
			response_status_code: '0',
			'service.name': 'currencyservice',
			span_id: '8439d7461ab457a2',
			timestamp: '2025-09-03T11:33:46.060209146Z',
			trace_id: '5ad9c01671f0e38582efe03bbf81360a',
		},
		timestamp: '2025-09-03T11:33:46.060209146Z',
	},
	{
		data: {
			duration_nano: 12485759,
			http_method: '',
			name: 'CurrencyService/Convert',
			response_status_code: '0',
			'service.name': 'currencyservice',
			span_id: '7dbf7811106b1049',
			timestamp: '2025-09-03T11:33:46.058715482Z',
			trace_id: '5ad9c01671f0e38582efe03bbf81360a',
		},
		timestamp: '2025-09-03T11:33:46.058715482Z',
	},
	{
		data: {
			duration_nano: 6950595,
			http_method: '',
			name: 'CurrencyService/Convert',
			response_status_code: '0',
			'service.name': 'currencyservice',
			span_id: '9adcdf1baa56d23a',
			timestamp: '2025-09-03T11:33:46.058319328Z',
			trace_id: '5ad9c01671f0e38582efe03bbf81360a',
		},
		timestamp: '2025-09-03T11:33:46.058319328Z',
	},
	{
		data: {
			duration_nano: 5323696,
			http_method: '',
			name: 'CurrencyService/Convert',
			response_status_code: '0',
			'service.name': 'currencyservice',
			span_id: '1a1b01a750dfe4d6',
			timestamp: '2025-09-03T11:33:46.057323233Z',
			trace_id: '5ad9c01671f0e38582efe03bbf81360a',
		},
		timestamp: '2025-09-03T11:33:46.057323233Z',
	},
	{
		data: {
			duration_nano: 133659,
			http_method: '',
			name: 'oteldemo.ProductCatalogService/GetProduct',
			response_status_code: '0',
			'service.name': 'productcatalogservice',
			span_id: '485a987e9dbf8ddd',
			timestamp: '2025-09-03T11:33:45.963838319Z',
			trace_id: '5ad9c01671f0e38582efe03bbf81360a',
		},
		timestamp: '2025-09-03T11:33:45.963838319Z',
	},
	{
		data: {
			duration_nano: 245000000,
			http_method: 'GET',
			name: '/api/checkout',
			response_status_code: '200',
			'service.name': 'checkoutservice',
			span_id: 'abc123def456',
			timestamp: '2025-09-03T11:33:45.800000000Z',
			trace_id: '5ad9c01671f0e38582efe03bbf81360a',
		},
		timestamp: '2025-09-03T11:33:45.800000000Z',
	},
	{
		data: {
			duration_nano: 150000000,
			http_method: 'POST',
			name: '/api/payment',
			response_status_code: '200',
			'service.name': 'paymentservice',
			span_id: 'def456ghi789',
			timestamp: '2025-09-03T11:33:45.750000000Z',
			trace_id: '5ad9c01671f0e38582efe03bbf81360a',
		},
		timestamp: '2025-09-03T11:33:45.750000000Z',
	},
];
