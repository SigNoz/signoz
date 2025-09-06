import OverlayScrollbar from 'components/OverlayScrollbar/OverlayScrollbar';
import { ArrowLeft, Plus, Settings, X } from 'lucide-react';
import ContextMenu from 'periscope/components/ContextMenu';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import { useCallback, useMemo } from 'react';
import { IDashboardVariable } from 'types/api/dashboard/getAll';
// import { PANEL_TYPES } from 'constants/queryBuilder';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

import useDashboardVariableUpdate from '../../NewDashboard/DashboardVariablesSelection/useDashboardVariableUpdate';
import { getAggregateColumnHeader } from './drilldownUtils';
import { AggregateData } from './useAggregateDrilldown';

interface UseBaseAggregateOptionsProps {
	setSubMenu: (subMenu: string) => void;
	fieldVariables: Record<string, string | number | boolean>;
	query?: Query;
	// panelType?: PANEL_TYPES;
	aggregateData?: AggregateData | null;
	widgetId?: string;
	onClose: () => void;
}

const useDashboardVarConfig = ({
	setSubMenu,
	fieldVariables,
	query,
	// panelType,
	aggregateData,
	widgetId,
	onClose,
}: UseBaseAggregateOptionsProps): {
	dashbaordVariablesConfig: {
		items: React.ReactNode;
	};
	// contextItems: React.ReactNode;
} => {
	const { selectedDashboard } = useDashboard();
	const { onValueUpdate, createVariable } = useDashboardVariableUpdate();

	const dynamicDashboardVariables = useMemo(
		(): [string, IDashboardVariable][] =>
			Object.entries(selectedDashboard?.data?.variables || {}).filter(
				([, value]) => value.name && value.type === 'DYNAMIC',
			),
		[selectedDashboard],
	);

	// Function to determine the source from query data
	const getSourceFromQuery = useCallback(():
		| 'logs'
		| 'traces'
		| 'metrics'
		| 'all sources' => {
		if (!query || !aggregateData?.queryName) return 'all sources';

		try {
			const { dataSource } = getAggregateColumnHeader(
				query,
				aggregateData.queryName,
			);
			if (dataSource === 'logs') return 'logs';
			if (dataSource === 'traces') return 'traces';
			if (dataSource === 'metrics') return 'metrics';
		} catch (error) {
			console.warn('Error determining data source:', error);
		}

		return 'all sources';
	}, [query, aggregateData?.queryName]);

	const handleSetVariable = useCallback(
		(
			fieldName: string,
			dashboardVar: [string, IDashboardVariable],
			fieldValue: any,
		) => {
			console.log('Setting variable:', {
				fieldName,
				dashboardVarId: dashboardVar[0],
				fieldValue,
			});
			onValueUpdate(fieldName, dashboardVar[1]?.id, fieldValue, false);
			onClose();
		},
		[onValueUpdate, onClose],
	);

	const handleUnsetVariable = useCallback(
		(fieldName: string, dashboardVar: [string, IDashboardVariable]) => {
			console.log('Unsetting variable:', {
				fieldName,
				dashboardVarId: dashboardVar[0],
			});
			onValueUpdate(fieldName, dashboardVar[0], null, false);
			onClose();
		},
		[onValueUpdate, onClose],
	);

	const handleCreateVariable = useCallback(
		(fieldName: string, fieldValue: string | number | boolean) => {
			const source = getSourceFromQuery();
			console.log('Creating variable from drilldown:', {
				fieldName,
				fieldValue,
				source,
				widgetId,
			});
			createVariable(
				fieldName,
				fieldValue,
				// 'DYNAMIC',
				`Variable created from drilldown for field: ${fieldName} (source: ${source})`,
				source,
				// widgetId,
			);
			onClose();
		},
		[createVariable, getSourceFromQuery, widgetId, onClose],
	);

	const contextItems = useMemo(
		() => (
			<>
				{' '}
				{Object.entries(fieldVariables).map(([fieldName, value]) => {
					const dashboardVar = dynamicDashboardVariables.find(
						([, dynamicValue]) =>
							dynamicValue.dynamicVariablesAttribute === fieldName,
					);
					if (dashboardVar) {
						const [dashboardVarKey, dashboardVarData] = dashboardVar;
						const fieldValue = value;
						const dashboardValue = dashboardVarData.selectedValue;

						// Check if values are the same
						let isSame = false;
						if (Array.isArray(dashboardValue)) {
							// If dashboard value is array, check if fieldValue equals the first element
							isSame = dashboardValue.length === 1 && dashboardValue[0] === fieldValue;
						} else {
							// If dashboard value is string, direct comparison
							isSame = dashboardValue === fieldValue;
						}

						if (isSame) {
							return (
								<ContextMenu.Item
									key={fieldName}
									icon={<X size={16} />}
									onClick={(): void =>
										handleUnsetVariable(fieldName, [dashboardVarKey, dashboardVarData])
									}
								>
									Unset <strong>${fieldName}</strong>
								</ContextMenu.Item>
							);
						}
						return (
							<ContextMenu.Item
								key={fieldName}
								icon={<Settings size={16} />}
								onClick={(): void =>
									handleSetVariable(
										fieldName,
										[dashboardVarKey, dashboardVarData],
										fieldValue,
									)
								}
							>
								Set <strong>${fieldName}</strong> to <strong>{fieldValue}</strong>
							</ContextMenu.Item>
						);
					}
					return (
						<ContextMenu.Item
							key={fieldName}
							icon={<Plus size={16} />}
							onClick={(): void => handleCreateVariable(fieldName, value)}
						>
							Create var <strong>${fieldName}</strong>:<strong>{value}</strong>
						</ContextMenu.Item>
					);
				})}
			</>
		),
		[
			fieldVariables,
			dynamicDashboardVariables,
			handleSetVariable,
			handleUnsetVariable,
			handleCreateVariable,
		],
	);

	const handleBackClick = useCallback(() => {
		setSubMenu('');
	}, [setSubMenu]);

	const dashbaordVariablesConfig = useMemo(
		() => ({
			items: (
				<>
					<ContextMenu.Header>
						<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
							<ArrowLeft
								size={14}
								style={{ cursor: 'pointer' }}
								onClick={handleBackClick}
							/>
							<span>Dashboard Variables</span>
						</div>
					</ContextMenu.Header>
					<div>
						<OverlayScrollbar
							style={{ maxHeight: '200px' }}
							options={{
								overflow: {
									x: 'hidden',
								},
							}}
						>
							{contextItems}
						</OverlayScrollbar>
					</div>
				</>
			),
		}),
		[contextItems, handleBackClick],
	);

	return { dashbaordVariablesConfig };
};

export default useDashboardVarConfig;
