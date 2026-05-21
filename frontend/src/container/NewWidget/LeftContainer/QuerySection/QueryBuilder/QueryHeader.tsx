import { ReactNode, useState } from 'react';
import {
	ChevronDown,
	ChevronRight,
	EyeClosed,
	EyeOpen,
	Trash2,
} from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { Row } from 'antd';

import { QueryWrapper } from '../styles';

import './QueryHeader.styles.scss';

interface IQueryHeaderProps {
	disabled: boolean;
	onDisable: VoidFunction;
	name: string;
	deletable: boolean;
	onDelete: VoidFunction;
	children: ReactNode;
}

function QueryHeader({
	disabled,
	onDisable,
	name,
	onDelete,
	deletable,
	children,
}: IQueryHeaderProps): JSX.Element {
	const [collapse, setCollapse] = useState(false);
	return (
		<QueryWrapper className="query-header-container">
			<Row style={{ justifyContent: 'space-between', marginBottom: '0.4rem' }}>
				<Row>
					<Button
						onClick={onDisable}
						className="action-btn"
						variant="outlined"
						color="secondary"
						prefix={disabled ? <EyeClosed size="md" /> : <EyeOpen size="md" />}
					>
						{name}
					</Button>
					<Button
						onClick={(): void => setCollapse(!collapse)}
						className="action-btn"
						variant="outlined"
						color="secondary"
						size="icon"
						prefix={collapse ? <ChevronRight size="md" /> : <ChevronDown size="md" />}
					/>
				</Row>

				{deletable && (
					<Button
						onClick={onDelete}
						className="action-btn"
						variant="outlined"
						color="destructive"
						size="icon"
						prefix={<Trash2 size="md" />}
					/>
				)}
			</Row>
			{!collapse && children}
		</QueryWrapper>
	);
}

export default QueryHeader;
