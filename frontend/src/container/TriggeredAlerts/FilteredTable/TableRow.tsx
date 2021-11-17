import React, { useCallback, useState } from 'react';
import { TableCell, TableRow, StatusContainer, IconContainer } from './styles';
import ExapandableRow from './ExapandableRow';
import { PlusSquareOutlined, MinusSquareOutlined } from '@ant-design/icons';
import { Button, Tag } from 'antd';
import { Alerts } from 'types/api/alerts/getAll';

const TableRowComponent = ({
	tags,
	tagsAlert,
}: TableRowComponentProps): JSX.Element => {
	const [isClicked, setIsClicked] = useState<boolean>(false);

	const onClickHandler = () => {
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
				<TableCell></TableCell>
				<TableCell></TableCell>
				<TableCell></TableCell>
				<TableCell></TableCell>
				<TableCell minWidth="200px">
					<Button type="primary">Resume Group</Button>
				</TableCell>
			</TableRow>
			{isClicked && <ExapandableRow allAlerts={tagsAlert} />}
		</div>
	);
};

interface TableRowComponentProps {
	tags: string[];
	tagsAlert: Alerts[];
}

export default TableRowComponent;
