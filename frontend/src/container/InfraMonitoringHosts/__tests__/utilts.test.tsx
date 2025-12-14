import { render } from '@testing-library/react';

import { formatDataForTable, GetHostsQuickFiltersConfig } from '../utils';

const PROGRESS_BAR_CLASS = '.progress-bar';

describe('InfraMonitoringHosts utils', () => {
	describe('formatDataForTable', () => {
		it('should format host data correctly', () => {
			const mockData = [
				{
					hostName: 'test-host',
					active: true,
					cpu: 0.95,
					memory: 0.85,
					wait: 0.05,
					load15: 2.5,
					os: 'linux',
				},
			] as any;

			const result = formatDataForTable(mockData);

			expect(result[0].hostName).toBe('test-host');
			expect(result[0].wait).toBe('5%');
			expect(result[0].load15).toBe(2.5);

			// Test active tag rendering
			const activeTag = render(result[0].active as JSX.Element);
			expect(activeTag.container.textContent).toBe('ACTIVE');
			expect(activeTag.container.querySelector('.active')).toBeTruthy();

			// Test CPU progress bar
			const cpuProgress = render(result[0].cpu as JSX.Element);
			const cpuProgressBar = cpuProgress.container.querySelector(
				PROGRESS_BAR_CLASS,
			);
			expect(cpuProgressBar).toBeTruthy();

			// Test memory progress bar
			const memoryProgress = render(result[0].memory as JSX.Element);
			const memoryProgressBar = memoryProgress.container.querySelector(
				PROGRESS_BAR_CLASS,
			);
			expect(memoryProgressBar).toBeTruthy();
		});

		it('should handle inactive hosts', () => {
			const mockData = [
				{
					hostName: 'test-host',
					active: false,
					cpu: 0.3,
					memory: 0.4,
					wait: 0.02,
					load15: 1.2,
					os: 'linux',
					cpuTimeSeries: [],
					memoryTimeSeries: [],
					waitTimeSeries: [],
					load15TimeSeries: [],
				},
			] as any;

			const result = formatDataForTable(mockData);

			const inactiveTag = render(result[0].active as JSX.Element);
			expect(inactiveTag.container.textContent).toBe('INACTIVE');
			expect(inactiveTag.container.querySelector('.inactive')).toBeTruthy();
		});
	});

	describe('GetHostsQuickFiltersConfig', () => {
		it('should return correct config when dotMetricsEnabled is true', () => {
			const result = GetHostsQuickFiltersConfig(true);

			expect(result[0].attributeKey.key).toBe('host.name');
			expect(result[1].attributeKey.key).toBe('os.type');
			expect(result[0].aggregateAttribute).toBe('system.cpu.load_average.15m');
		});

		it('should return correct config when dotMetricsEnabled is false', () => {
			const result = GetHostsQuickFiltersConfig(false);

			expect(result[0].attributeKey.key).toBe('host_name');
			expect(result[1].attributeKey.key).toBe('os_type');
			expect(result[0].aggregateAttribute).toBe('system_cpu_load_average_15m');
		});
	});
});
