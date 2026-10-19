import { useMemo } from 'react';

import JsonBlock from '../JsonBlock';
import PartChip from '../PartChip';
import { parseJsonObject, TOOL_CALL_ID_ATTR, toToolCallKey } from '../utils';

import styles from '../AIThreadMessage.module.scss';

interface ToolCallPartProps {
	id: string;
	name: string;
	args: unknown;
	type: 'tool_call' | 'server_tool_call';
}

function ToolCallPart({
	id,
	name,
	args,
	type,
}: ToolCallPartProps): JSX.Element {
	// Streamed calls can carry truncated, unparseable argument strings.
	const json = useMemo(() => {
		if (typeof args === 'string') {
			return parseJsonObject(args);
		}
		return typeof args === 'object' && args !== null ? args : undefined;
	}, [args]);

	const toolCallAttr = {
		[TOOL_CALL_ID_ATTR]: toToolCallKey(id, type === 'server_tool_call'),
	};

	return (
		<div className={styles.toolCall} {...toolCallAttr} data-testid="ai-tool-call">
			<PartChip
				label={type}
				tone="info"
				isPlain
				value={
					<>
						<span className={styles.chipKey}>name :</span>
						<span className={styles.toolName}>{name}</span>
					</>
				}
			/>
			{json ? (
				<JsonBlock data={json} />
			) : (
				<span className={styles.empty}> - </span>
			)}
		</div>
	);
}

export default ToolCallPart;
