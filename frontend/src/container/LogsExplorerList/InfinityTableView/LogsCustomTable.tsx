import Spinner from 'components/Spinner';
import { dragColumnParams } from 'hooks/useDragColumns/configs';
import ReactDragListView from 'react-drag-listview';
import { TableComponents } from 'react-virtuoso';

import { TableStyled } from './styles';

interface LogsCustomTableProps {
	isLoading?: boolean;
	handleDragEnd: (fromIndex: number, toIndex: number) => void;
}

export const LogsCustomTable = ({
	isLoading,
	handleDragEnd,
}: LogsCustomTableProps): TableComponents['Table'] =>
	function CustomTable({ style, children }): JSX.Element {
		if (isLoading) {
			return <Spinner height="35px" tip="Getting Logs" />;
		}
		return (
			<ReactDragListView.DragColumn
				// eslint-disable-next-line react/jsx-props-no-spreading
				{...dragColumnParams}
				onDragEnd={handleDragEnd}
			>
				<TableStyled style={style}>{children}</TableStyled>
			</ReactDragListView.DragColumn>
		);
	};
