import { useMemo } from 'react';
import LogsFormatOptionsMenu from 'components/LogsFormatOptionsMenu/LogsFormatOptionsMenu';
import { OptionsMenuConfig } from 'container/OptionsMenu/types';

import { useAuditLogsOptionsStore } from '../hooks/useAuditLogsOptionsStore';

export function OptionsMenu(): JSX.Element {
	const fontSize = useAuditLogsOptionsStore((state) => state.fontSize);
	const setFontSize = useAuditLogsOptionsStore((state) => state.setFontSize);

	const config: OptionsMenuConfig = useMemo(
		() => ({ fontSize: { value: fontSize, onChange: setFontSize } }),
		[fontSize, setFontSize],
	);

	return (
		<LogsFormatOptionsMenu
			items={[]}
			selectedOptionFormat={undefined}
			config={config}
		/>
	);
}
