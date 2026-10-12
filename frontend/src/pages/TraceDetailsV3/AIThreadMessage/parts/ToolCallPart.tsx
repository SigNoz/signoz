import { useMemo } from 'react';
import { Badge } from '@signozhq/ui/badge';

import JsonBlock from '../JsonBlock';
import PartChip from '../PartChip';
import TextContent from '../TextContent';
import { parseJsonObject, TOOL_CALL_ID_ATTR } from '../utils';

import styles from '../AIThreadMessage.module.scss';

interface ToolCallPartProps {
	id: string;
	name: string;
	args: unknown;
	server?: boolean;
}

function ToolCallPart({
	id,
	name,
	args,
	server,
}: ToolCallPartProps): JSX.Element {
	// Streamed calls can carry truncated, unparseable argument strings.
	const json = useMemo(() => {
		if (typeof args === 'string') {
			return parseJsonObject(args);
		}
		return typeof args === 'object' && args !== null ? args : undefined;
	}, [args]);

	const toolCallAttr = { [TOOL_CALL_ID_ATTR]: id };

	return (
		<div className={styles.toolCall} {...toolCallAttr} data-testid="ai-tool-call">
			<PartChip
				label="tool_call"
				value={
					<>
						<span className={styles.chipKey}>name :</span>
						<span className={styles.toolName}>{name}</span>
					</>
				}
			>
				{server && (
					<Badge color="secondary" variant="outline">
						server
					</Badge>
				)}
			</PartChip>
			{json ? (
				<JsonBlock data={json} />
			) : (
				args !== undefined &&
				args !== null && (
					<TextContent
						text={typeof args === 'string' ? args : JSON.stringify(args)}
					/>
				)
			)}
		</div>
	);
}

ToolCallPart.defaultProps = {
	server: false,
};

export default ToolCallPart;
