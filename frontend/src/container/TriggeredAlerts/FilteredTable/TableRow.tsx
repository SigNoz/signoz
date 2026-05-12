import { useState } from 'react';
import { SquareMinus, SquarePlus } from '@signozhq/icons';
import { Tag } from 'antd';
import { Alerts } from 'types/api/alerts/getTriggered';

import ExapandableRow from './ExapandableRow';
import { IconContainer, StatusContainer, TableCell, TableRow } from './styles';

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
				<TableCell minWidth="90px">
					<StatusContainer>
						<IconContainer onClick={onClickHandler}>
							{!isClicked ? <SquarePlus size="md" /> : <SquareMinus size="md" />}
						</IconContainer>
						<>
							{tags.map((tag) => (
								<Tag color="magenta" key={tag}>
									{tag}
								</Tag>
							))}
						</>
					</StatusContainer>
				</TableCell>
				<TableCell minWidth="90px" />
				<TableCell minWidth="90px" />
				<TableCell minWidth="90px" />
				<TableCell minWidth="90px" />
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
