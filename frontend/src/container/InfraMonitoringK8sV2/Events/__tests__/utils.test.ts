import { EventRow } from 'container/InfraMonitoringK8sV2/EntityDetailsUtils/EntityEvents/hooks';
import {
	getEventDrillDownTarget,
	isWarningSeverity,
	readEventField,
	toK8sEventRow,
} from 'container/InfraMonitoringK8sV2/Events/utils';
import { K8sEventRow } from 'container/InfraMonitoringK8sV2/Events/types';

function buildRow(overrides: Partial<K8sEventRow> = {}): K8sEventRow {
	return {
		key: 'evt-1',
		id: 'evt-1',
		timestamp: '2026-09-09T10:00:00Z',
		body: 'Back-off restarting failed container',
		severity: 'WARNING',
		kind: 'Deployment',
		objectName: 'checkout',
		namespace: 'shop',
		reason: 'BackOff',
		attributes_string: {},
		resources_string: {},
		...overrides,
	};
}

describe('readEventField', () => {
	it('reads from attributes first', () => {
		const source = {
			attributes_string: { 'k8s.cluster.name': 'from-attrs' },
			resources_string: { 'k8s.cluster.name': 'from-resources' },
		};

		expect(readEventField(source, 'k8s.cluster.name')).toBe('from-attrs');
	});

	it('falls back to resources when the attribute is absent', () => {
		const source = {
			attributes_string: {},
			resources_string: { 'k8s.cluster.name': 'from-resources' },
		};

		expect(readEventField(source, 'k8s.cluster.name')).toBe('from-resources');
	});

	it('returns an empty string when neither carries the key', () => {
		expect(readEventField({}, 'k8s.cluster.name')).toBe('');
	});
});

describe('isWarningSeverity', () => {
	it.each(['WARNING', 'warning', 'Warn', 'ERROR'])(
		'treats %s as warning',
		(severity) => {
			expect(isWarningSeverity(severity)).toBe(true);
		},
	);

	it.each(['NORMAL', 'INFO', ''])('treats %s as not a warning', (severity) => {
		expect(isWarningSeverity(severity)).toBe(false);
	});
});

describe('toK8sEventRow', () => {
	it('lifts k8s event attributes into flat columns', () => {
		const event: EventRow = {
			timestamp: '2026-09-09T10:00:00Z',
			data: {
				id: 'evt-9',
				body: 'Liveness probe failed',
				severity_text: 'WARNING',
				attributes_string: {
					'k8s.object.kind': 'Pod',
					'k8s.object.name': 'payments-abc',
					'k8s.namespace.name': 'shop',
					'k8s.event.reason': 'Unhealthy',
				},
				resources_string: { 'k8s.cluster.name': 'dev-cluster' },
			},
		};

		expect(toK8sEventRow(event)).toMatchObject({
			id: 'evt-9',
			kind: 'Pod',
			objectName: 'payments-abc',
			namespace: 'shop',
			reason: 'Unhealthy',
			severity: 'WARNING',
		});
	});

	it('leaves columns blank when the collector omitted the attributes', () => {
		const event: EventRow = {
			timestamp: '2026-09-09T10:00:00Z',
			data: { id: 'evt-10', body: 'something', severity_text: 'NORMAL' },
		};

		expect(toK8sEventRow(event)).toMatchObject({
			kind: '',
			objectName: '',
			namespace: '',
			reason: '',
		});
	});
});

describe('getEventDrillDownTarget', () => {
	it('targets name-keyed entities by object name', () => {
		expect(getEventDrillDownTarget(buildRow())).toStrictEqual({
			category: 'deployments',
			params: {
				selectedItem: 'checkout',
				clusterName: null,
				namespaceName: 'shop',
			},
		});
	});

	it('carries the cluster through when present', () => {
		const row = buildRow({
			resources_string: { 'k8s.cluster.name': 'dev-cluster' },
		});

		expect(getEventDrillDownTarget(row)?.params.clusterName).toBe('dev-cluster');
	});

	it('targets pods by uid, since the pod drawer is keyed on uid', () => {
		const row = buildRow({
			kind: 'Pod',
			objectName: 'payments-abc',
			attributes_string: { 'k8s.object.uid': 'uid-payments-abc' },
		});

		expect(getEventDrillDownTarget(row)?.params.selectedItem).toBe(
			'uid-payments-abc',
		);
	});

	it('refuses a pod target when the uid is missing', () => {
		const row = buildRow({ kind: 'Pod', objectName: 'payments-abc' });

		expect(getEventDrillDownTarget(row)).toBeNull();
	});

	it('returns null for kinds without a details drawer', () => {
		expect(getEventDrillDownTarget(buildRow({ kind: 'ReplicaSet' }))).toBeNull();
	});

	it('returns null when the object name is missing', () => {
		expect(getEventDrillDownTarget(buildRow({ objectName: '' }))).toBeNull();
	});
});
