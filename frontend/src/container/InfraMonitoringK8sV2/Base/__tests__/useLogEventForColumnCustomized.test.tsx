/* eslint-disable no-restricted-syntax */
import { act, renderHook } from '@testing-library/react';
import { TableColumnDef, useColumnStore } from 'components/TanStackTableView';

import { InfraMonitoringEntity } from '../../constants';
import { useInfraMonitoringTablePreferencesStore } from '../useInfraMonitoringTablePreferencesStore';
import { useLogEventForColumnCustomized } from '../useLogEventForColumnCustomized';
import { logInfraColumnCustomizedEvent } from 'container/InfraMonitoringK8sV2/Base/events';

jest.mock('container/InfraMonitoringK8sV2/Base/events', () => ({
	logInfraColumnCustomizedEvent: jest.fn(),
}));

const mockLogEvent = logInfraColumnCustomizedEvent as jest.Mock;

type TestRow = { id: string; name: string };

const col = (id: string): TableColumnDef<TestRow> => ({
	id,
	header: id,
	cell: (): null => null,
});

const columns = [col('a'), col('b'), col('c')];

describe('useLogEventForColumnCustomized', () => {
	beforeEach(() => {
		useColumnStore.setState({ tables: {} });
		useInfraMonitoringTablePreferencesStore.setState({
			lineClamp: 1,
			fontSize: 'medium',
		});
		localStorage.clear();
		mockLogEvent.mockClear();
	});

	it('does not emit on mount', () => {
		const storageKey = 'test-no-emit-on-mount';
		act(() => {
			useColumnStore.getState().initializeFromDefaults(storageKey, columns);
		});

		renderHook(() =>
			useLogEventForColumnCustomized({
				entity: InfraMonitoringEntity.PODS,
				source: 'list',
				storageKey,
				columns,
			}),
		);

		expect(mockLogEvent).not.toHaveBeenCalled();
	});

	it('emits when a column is hidden after mount', () => {
		const storageKey = 'test-emit-on-hide';
		act(() => {
			useColumnStore.getState().initializeFromDefaults(storageKey, columns);
		});

		renderHook(() =>
			useLogEventForColumnCustomized({
				entity: InfraMonitoringEntity.PODS,
				source: 'list',
				storageKey,
				columns,
			}),
		);

		act(() => {
			useColumnStore.getState().hideColumn(storageKey, 'b');
		});

		expect(mockLogEvent).toHaveBeenCalledTimes(1);
		expect(mockLogEvent).toHaveBeenCalledWith(
			InfraMonitoringEntity.PODS,
			['a', 'c'],
			'medium',
			1,
			'list',
		);
	});

	it('emits when font size changes after mount', () => {
		const storageKey = 'test-emit-on-font-size';
		act(() => {
			useColumnStore.getState().initializeFromDefaults(storageKey, columns);
		});

		renderHook(() =>
			useLogEventForColumnCustomized({
				entity: InfraMonitoringEntity.PODS,
				source: 'list',
				storageKey,
				columns,
			}),
		);

		act(() => {
			useInfraMonitoringTablePreferencesStore.getState().setFontSize('small');
		});

		expect(mockLogEvent).toHaveBeenCalledTimes(1);
	});

	// Regression: K8sDynamicList keeps K8sBaseList (and the options side panel)
	// mounted across category switches, so this hook survives a Pods -> Nodes
	// switch with every input changed. The switch itself is not a customization
	// and must not emit.
	it('does not emit when the storage key changes (category switch)', () => {
		const podsKey = 'test-switch-pods';
		const nodesKey = 'test-switch-nodes';
		const nodeColumns = [col('x'), col('y')];
		act(() => {
			useColumnStore.getState().initializeFromDefaults(podsKey, columns);
			useColumnStore.getState().initializeFromDefaults(nodesKey, nodeColumns);
		});

		const { rerender } = renderHook(
			(props) => useLogEventForColumnCustomized(props),
			{
				initialProps: {
					entity: InfraMonitoringEntity.PODS,
					source: 'list' as const,
					storageKey: podsKey,
					columns,
				},
			},
		);

		rerender({
			entity: InfraMonitoringEntity.NODES,
			source: 'list' as const,
			storageKey: nodesKey,
			columns: nodeColumns,
		});

		expect(mockLogEvent).not.toHaveBeenCalled();

		// A real customization after the switch still emits, for the new entity
		act(() => {
			useColumnStore.getState().hideColumn(nodesKey, 'y');
		});

		expect(mockLogEvent).toHaveBeenCalledTimes(1);
		expect(mockLogEvent).toHaveBeenCalledWith(
			InfraMonitoringEntity.NODES,
			['x'],
			'medium',
			1,
			'list',
		);
	});

	// Regression: every expanded group row mounts its own instance sharing the
	// `k8s-<entity>-columns-expanded` storage key; one customization must not
	// emit once per row.
	it('emits once when multiple instances share a storage key', () => {
		const storageKey = 'test-shared-key';
		act(() => {
			useColumnStore.getState().initializeFromDefaults(storageKey, columns);
		});

		const params = {
			entity: InfraMonitoringEntity.PODS,
			source: 'expanded' as const,
			storageKey,
			columns,
		};
		renderHook(() => useLogEventForColumnCustomized(params));
		renderHook(() => useLogEventForColumnCustomized(params));
		renderHook(() => useLogEventForColumnCustomized(params));

		act(() => {
			useColumnStore.getState().hideColumn(storageKey, 'a');
		});

		expect(mockLogEvent).toHaveBeenCalledTimes(1);

		// A subsequent distinct customization emits again, exactly once
		act(() => {
			useColumnStore.getState().hideColumn(storageKey, 'b');
		});

		expect(mockLogEvent).toHaveBeenCalledTimes(2);
	});
});
