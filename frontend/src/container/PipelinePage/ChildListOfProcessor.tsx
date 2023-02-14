import {
	CopyFilled,
	DeleteFilled,
	EditOutlined,
	PlusCircleOutlined,
} from '@ant-design/icons';
import { Avatar, Button } from 'antd';
import { ColumnsType } from 'antd/lib/table';
import { themeColors } from 'constants/theme';
import { useIsDarkMode } from 'hooks/useDarkMode';
import React, { useCallback } from 'react';
import update from 'react-addons-update';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useTranslation } from 'react-i18next';

import { modalFooterStyle, sublistDataStyle, tableComponents } from './config';
import { AlertMessageType, SubPiplineColumsType } from './ListOfPipelines';
import {
	IconListStyle,
	ListDataStyle,
	ModalFooterTitle,
	StyledTable,
} from './styles';

function ChildListOfProcessor({
	getCommonAction,
	handleAlert,
	childDataSource,
	setChildDataSource,
	setActionType,
	handleProcessorEditAction,
}: ChildListOfProcessorTypes): JSX.Element {
	const { t } = useTranslation(['pipeline']);
	const isDarkMode = useIsDarkMode();

	const handleDelete = (record: SubPiplineColumsType): void => {
		const findElement = childDataSource?.filter((data) => data.id !== record.id);
		setChildDataSource(findElement);
	};

	const handleProcessorDeleteAction = (record: SubPiplineColumsType): void => {
		handleAlert({
			title: `${t('delete_processor')} : ${record.text}?`,
			descrition: t('delete_processor_description'),
			buttontext: t('delete'),
			onOkClick: (): void => handleDelete(record),
		});
	};

	const subcolumns: ColumnsType<SubPiplineColumsType> = [
		{
			title: '',
			dataIndex: 'id',
			key: 'id',
			width: 30,
			align: 'right',
			render: (index: number): JSX.Element => (
				<Avatar style={sublistDataStyle} size="small">
					{index + 1}
				</Avatar>
			),
		},
		{
			title: '',
			dataIndex: 'text',
			key: 'list',
			width: 10,
			render: (item: string): JSX.Element => <ListDataStyle>{item}</ListDataStyle>,
		},
		{
			title: '',
			dataIndex: 'action',
			key: 'action',
			width: 10,
			render: (_value, record): JSX.Element => (
				<IconListStyle>
					<span key="list-edit">
						<EditOutlined
							style={{ color: themeColors.gainsboro, fontSize: '1rem' }}
							onClick={(): void => handleProcessorEditAction(record)}
						/>
					</span>
					<span key="list-view">
						<DeleteFilled
							onClick={(): void => handleProcessorDeleteAction(record)}
							style={{ color: themeColors.gainsboro, fontSize: '1rem' }}
						/>
					</span>
					<span key="list-copy">
						<CopyFilled style={{ color: themeColors.gainsboro, fontSize: '1rem' }} />
					</span>
				</IconListStyle>
			),
		},
		{
			title: '',
			dataIndex: 'dragAction',
			key: 'drag-action',
			width: 10,
			render: (): JSX.Element => getCommonAction(),
		},
	];

	const moveProcessorRow = useCallback(
		(dragIndex: number, hoverIndex: number) => {
			const rawData = childDataSource;
			const dragRows = childDataSource?.[dragIndex];
			if (childDataSource) {
				const updatedRows = update(childDataSource, {
					$splice: [
						[dragIndex, 1],
						[hoverIndex, 0, dragRows],
					],
				});
				if (dragRows) {
					handleAlert({
						title: t('reorder_processor'),
						descrition: t('reorder_processor_description'),
						buttontext: t('reorder'),
						onOkClick: (): void => setChildDataSource(updatedRows),
						onCancelClick: (): void => setChildDataSource(rawData),
					});
				}
			}
		},
		[childDataSource, handleAlert, setChildDataSource, t],
	);

	const onClickHandler = (): void => {
		setActionType('add-processor');
	};

	const getFooterElement = (): JSX.Element => (
		<Button type="link" style={modalFooterStyle} onClick={onClickHandler}>
			<PlusCircleOutlined />
			<ModalFooterTitle>{t('add_new_processor')}</ModalFooterTitle>
		</Button>
	);

	return (
		<DndProvider backend={HTML5Backend}>
			<StyledTable
				isDarkMode={isDarkMode}
				showHeader={false}
				columns={subcolumns}
				size="small"
				components={tableComponents}
				dataSource={childDataSource}
				pagination={false}
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				onRow={(_record: any, index: any): React.HTMLAttributes<any> => {
					const attr = {
						index,
						moveRow: moveProcessorRow,
					};
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					return attr as React.HTMLAttributes<any>;
				}}
				footer={(): React.ReactElement => getFooterElement()}
			/>
		</DndProvider>
	);
}

interface ChildListOfProcessorTypes {
	getCommonAction: () => JSX.Element;
	handleAlert: (props: AlertMessageType) => void;
	childDataSource: Array<SubPiplineColumsType> | undefined;
	setActionType: (b?: string) => void;
	setChildDataSource: (value: Array<SubPiplineColumsType> | undefined) => void;
	handleProcessorEditAction: (record: SubPiplineColumsType) => void;
}

export default ChildListOfProcessor;
