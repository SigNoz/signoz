import { render, screen } from '@testing-library/react';
import { HostData, TimeSeries } from 'api/infraMonitoring/getHostLists';

import { hostRenderRowData } from '../table.config';
import { getHostsQuickFiltersConfig, HostnameCell } from '../utils';

const emptyTimeSeries: TimeSeries = {
	labels: {},
	labelsArray: [],
	values: [],
};

describe('InfraMonitoringHosts utils', () => {
	describe('hostRenderRowData', () => {
		it('should format host data correctly', () => {
			const host: HostData = {
				hostName: 'test-host',
				active: true,
				cpu: 0.95,
				memory: 0.85,
				wait: 0.05,
				load15: 2.5,
				os: 'linux',
				cpuTimeSeries: emptyTimeSeries,
				memoryTimeSeries: emptyTimeSeries,
				waitTimeSeries: emptyTimeSeries,
				load15TimeSeries: emptyTimeSeries,
			};

			const result = hostRenderRowData(host, []);

			expect(result.wait).toBe('5%');
			expect(result.load15).toBe(2.5);
			expect(result.itemKey).toBe('test-host');
			expect(result.hostName).toBe('test-host');

			const activeTag = render(result.active as JSX.Element);
			expect(activeTag.container.textContent).toBe('ACTIVE');
			expect(activeTag.getByText('ACTIVE')).toBeTruthy();

			const cpuProgress = render(result.cpu as JSX.Element);
			expect(cpuProgress.container.querySelector('.ant-progress')).toBeTruthy();

			const memoryProgress = render(result.memory as JSX.Element);
			expect(memoryProgress.container.querySelector('.ant-progress')).toBeTruthy();
		});

		it('should handle inactive hosts', () => {
			const host: HostData = {
				hostName: 'test-host',
				active: false,
				cpu: 0.3,
				memory: 0.4,
				wait: 0.02,
				load15: 1.2,
				os: 'linux',
				cpuTimeSeries: emptyTimeSeries,
				memoryTimeSeries: emptyTimeSeries,
				waitTimeSeries: emptyTimeSeries,
				load15TimeSeries: emptyTimeSeries,
			};

			const result = hostRenderRowData(host, []);

			const inactiveTag = render(result.active as JSX.Element);
			expect(inactiveTag.container.textContent).toBe('INACTIVE');
			expect(inactiveTag.getByText('INACTIVE')).toBeTruthy();
		});

		it('should use empty itemKey when host has no hostname', () => {
			const host: HostData = {
				hostName: '',
				active: true,
				cpu: 0.5,
				memory: 0.4,
				wait: 0.01,
				load15: 1.0,
				os: 'linux',
				cpuTimeSeries: emptyTimeSeries,
				memoryTimeSeries: emptyTimeSeries,
				waitTimeSeries: emptyTimeSeries,
				load15TimeSeries: emptyTimeSeries,
			};

			const result = hostRenderRowData(host, []);
			expect(result.itemKey).toBe('');
		});
	});

	describe('HostnameCell', () => {
		it('should render hostname when present (case A: no icon)', () => {
			const { container } = render(<HostnameCell hostName="gke-prod-1" />);
			expect(container.querySelector('.hostname-column-value')).toBeTruthy();
			expect(container.textContent).toBe('gke-prod-1');
			expect(container.querySelector('.hostname-cell-missing')).toBeFalsy();
			expect(container.querySelector('.hostname-cell-warning-icon')).toBeFalsy();
		});

		it('should render placeholder and icon when hostName is empty (case B)', () => {
			const { container } = render(<HostnameCell hostName="" />);
			expect(screen.getByText('-')).toBeTruthy();
			expect(container.querySelector('.hostname-cell-missing')).toBeTruthy();
			const iconWrapper = container.querySelector('.hostname-cell-warning-icon');
			expect(iconWrapper).toBeTruthy();
			expect(iconWrapper?.getAttribute('aria-label')).toBe(
				'Missing host.name metadata',
			);
			expect(iconWrapper?.getAttribute('tabindex')).toBe('0');
		});

		it('should render placeholder and icon when hostName is whitespace only (case C)', () => {
			const { container } = render(<HostnameCell hostName="   " />);
			expect(screen.getByText('-')).toBeTruthy();
			expect(container.querySelector('.hostname-cell-missing')).toBeTruthy();
			expect(container.querySelector('.hostname-cell-warning-icon')).toBeTruthy();
		});

		it('should render placeholder and icon when hostName is undefined (case D)', () => {
			const { container } = render(<HostnameCell hostName={undefined} />);
			expect(screen.getByText('-')).toBeTruthy();
			expect(container.querySelector('.hostname-cell-missing')).toBeTruthy();
			expect(container.querySelector('.hostname-cell-warning-icon')).toBeTruthy();
		});
	});

	describe('getHostsQuickFiltersConfig', () => {
		it('should return correct config when dotMetricsEnabled is true', () => {
			const result = getHostsQuickFiltersConfig(true);

			expect(result[0].attributeKey.key).toBe('host.name');
			expect(result[1].attributeKey.key).toBe('os.type');
			expect(result[0].aggregateAttribute).toBe('system.cpu.load_average.15m');
		});

		it('should return correct config when dotMetricsEnabled is false', () => {
			const result = getHostsQuickFiltersConfig(false);

			expect(result[0].attributeKey.key).toBe('host_name');
			expect(result[1].attributeKey.key).toBe('os_type');
			expect(result[0].aggregateAttribute).toBe('system_cpu_load_average_15m');
		});
	});
});
