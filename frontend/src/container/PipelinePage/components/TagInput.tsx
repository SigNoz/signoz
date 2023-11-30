import {
	CloseCircleFilled,
	ExclamationCircleOutlined,
} from '@ant-design/icons';
import { Button, Input, InputRef, message, Modal, Tag, Tooltip } from 'antd';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { tagInputStyle } from '../PipelineListsView/config';
import { TagInputWrapper } from './styles';

function TagInput({
	setTagsListData,
	tagsListData,
	placeHolder,
}: TagInputProps): JSX.Element {
	const [inputVisible, setInputVisible] = useState(false);
	const [inputValue, setInputValue] = useState<string>('');
	const [editInputIndex, setEditInputIndex] = useState(-1);
	const [editInputValue, setEditInputValue] = useState('');
	const inputRef = useRef<InputRef>(null);
	const editInputRef = useRef<InputRef>(null);
	const { t } = useTranslation(['alerts']);

	useEffect(() => {
		if (inputVisible) {
			inputRef.current?.focus();
		}
	}, [inputVisible]);

	useEffect(() => {
		editInputRef.current?.focus();
	}, [inputValue]);

	const handleClose = (removedTag: string) => (): void => {
		const newTags = tagsListData?.filter((tag) => tag !== removedTag);
		setTagsListData(newTags);
	};

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
		setInputValue(e.target.value);
	};

	const handleInputConfirm = (): void => {
		if (inputValue && tagsListData?.indexOf(inputValue) === -1) {
			setTagsListData([...tagsListData, inputValue]);
		}
		setInputVisible(false);
		setInputValue('');
	};

	const handleEditInputChange = (
		e: React.ChangeEvent<HTMLInputElement>,
	): void => {
		setEditInputValue(e.target.value);
	};

	const handleEditInputConfirm = (): void => {
		const newTags = [...tagsListData];
		newTags[editInputIndex] = editInputValue;
		setTagsListData(newTags);
		setEditInputIndex(-1);
		setInputValue('');
	};

	const handleClearAll = (): void => {
		Modal.confirm({
			title: 'Confirm',
			icon: <ExclamationCircleOutlined />,
			content: t('remove_label_confirm'),
			onOk() {
				setTagsListData([]);
				message.success(t('remove_label_success'));
			},
			okText: t('button_yes'),
			cancelText: t('button_no'),
		});
	};

	const showAllData = tagsListData?.map((tag: string, index: number) => {
		if (editInputIndex === index) {
			return (
				<Input
					ref={editInputRef}
					key={tag}
					style={tagInputStyle}
					value={editInputValue}
					onChange={handleEditInputChange}
					onBlur={handleEditInputConfirm}
					onPressEnter={handleEditInputConfirm}
				/>
			);
		}
		const isLongTag = tag.length > 20;
		const tagElem = (
			<Tag
				key={tag}
				closable
				style={{ userSelect: 'none' }}
				onClose={handleClose(tag)}
			>
				<span
					onDoubleClick={(e): void => {
						setEditInputIndex(index);
						setEditInputValue(tag);
						e.preventDefault();
					}}
				>
					{isLongTag ? `${tag.slice(0, 20)}...` : tag}
				</span>
			</Tag>
		);
		return isLongTag ? (
			<Tooltip title={tag} key={tag}>
				{tagElem}
			</Tooltip>
		) : (
			tagElem
		);
	});

	const isButtonVisible = useMemo(
		() => tagsListData?.length || inputValue.length || inputValue,
		[inputValue, tagsListData?.length],
	);

	return (
		<TagInputWrapper>
			<Input
				ref={inputRef}
				type="text"
				style={tagInputStyle}
				value={inputValue}
				onChange={handleInputChange}
				onBlur={handleInputConfirm}
				onPressEnter={(e): void => {
					e.preventDefault();
					handleInputConfirm();
				}}
				placeholder={placeHolder}
				prefix={showAllData}
			/>

			{isButtonVisible ? (
				<Button onClick={handleClearAll} icon={<CloseCircleFilled />} type="text" />
			) : null}
		</TagInputWrapper>
	);
}

interface TagInputProps {
	setTagsListData: (tags: Array<string>) => void;
	tagsListData: Array<string>;
	placeHolder: string;
}

export default TagInput;
