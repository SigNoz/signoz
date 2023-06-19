import { MinusSquareOutlined, PlusSquareOutlined } from '@ant-design/icons';
import { Tag } from 'antd';
import { useState } from 'react';
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
				<TableCell>
					<StatusContainer>
						<IconContainer onClick={onClickHandler}>
							{!isClicked ? <PlusSquareOutlined /> : <MinusSquareOutlined />}
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
