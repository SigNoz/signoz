import { MinusSquareOutlined, PlusSquareOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { Alerts } from 'types/api/alerts/getTriggered';

import ExapandableRow from './ExapandableRow';
import {
	EllipsisTag,
	IconContainer,
	StatusContainer,
	TableCell,
	TableRow,
} from './styles';

function TableRowComponent({
	tags,
	tagsAlert,
}: TableRowComponentProps): JSX.Element {
	const [isClicked, setIsClicked] = useState<boolean>(false);

	const onClickHandler = (): void => {
		setIsClicked((state) => !state);
	};

	return (
		<div>
			<TableRow>
				<TableCell>
					<StatusContainer>
						<IconContainer onClick={onClickHandler}>
							{!isClicked ? <PlusSquareOutlined /> : <MinusSquareOutlined />}
						</IconContainer>
						<>
							{tags.map((tag) => (
								<EllipsisTag color="magenta" key={tag} title={tag}>
									{tag}
								</EllipsisTag>
							))}
						</>
					</StatusContainer>
				</TableCell>
				<TableCell />
				<TableCell />
				<TableCell />
				<TableCell />
				{/* <TableCell minWidth="200px">
					<Button type="primary">Resume Group</Button>
				</TableCell> */}
			</TableRow>
			{isClicked && <ExapandableRow allAlerts={tagsAlert} />}
		</div>
	);
}

interface TableRowComponentProps {
	tags: string[];
	tagsAlert: Alerts[];
}

export default TableRowComponent;
