import { render, screen } from '@testing-library/react';
import { HostData, TimeSeries } from 'api/infraMonitoring/getHostLists';

import {
	formatDataForTable,
	GetHostsQuickFiltersConfig,
	HostnameCell,
} from '../utils';

const PROGRESS_BAR_CLASS = '.progress-bar';

const emptyTimeSeries: TimeSeries = {
	labels: {},
	labelsArray: [],
	values: [],
};

describe('InfraMonitoringHosts utils', () => {
	describe('formatDataForTable', () => {
		it('should format host data correctly', () => {
			const mockData: HostData[] = [
				{
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
				},
			];

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
			const mockData: HostData[] = [
				{
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
				},
			];

			const result = formatDataForTable(mockData);

			const inactiveTag = render(result[0].active as JSX.Element);
			expect(inactiveTag.container.textContent).toBe('INACTIVE');
			expect(inactiveTag.container.querySelector('.inactive')).toBeTruthy();
		});

		it('should set hostName to empty string when host has no hostname', () => {
			const mockData: HostData[] = [
				{
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
				},
			];

			const result = formatDataForTable(mockData);
			expect(result[0].hostName).toBe('');
			expect(result[0].key).toBe('-0');
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
			// Tooltip with "Learn how to configure →" link is shown on hover/focus
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
