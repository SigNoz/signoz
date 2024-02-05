import { PANEL_TYPES } from 'constants/queryBuilder';
import { useEffect, useState } from 'react';
import { ILog } from 'types/api/logs/log';
import { QueryDataV3 } from 'types/api/widgets/getQuery';

export const useLogsData = ({
	result,
	panelType,
}: {
	result: QueryDataV3[] | undefined;
	panelType: PANEL_TYPES;
}): ILog[] => {
	const [logs, setLogs] = useState<ILog[]>([]);

	useEffect(() => {
		if (panelType !== PANEL_TYPES.LIST) return;
		const currentData = result || [];
		if (currentData.length > 0 && currentData[0].list) {
			const currentLogs: ILog[] = currentData[0].list.map((item) => ({
				...item.data,
				timestamp: item.timestamp,
			}));
			const newLogs = [...logs, ...currentLogs];

			setLogs(newLogs);
		}

		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [result]);

	return logs;
};
