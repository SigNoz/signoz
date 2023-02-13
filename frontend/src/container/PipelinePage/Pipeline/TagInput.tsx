import {
	CloseCircleFilled,
	ExclamationCircleOutlined,
} from '@ant-design/icons';
import { Button, Input, InputRef, message, Modal, Tag, Tooltip } from 'antd';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

function TagInput({
	setTagsListData,
	initialvalues,
}: {
	setTagsListData: (tags: Array<string>) => void;
	initialvalues: Array<string> | undefined;
}): JSX.Element | null {
	const [tags, setTags] = useState<Array<string>>(initialvalues ?? []);
	const [inputVisible, setInputVisible] = useState(false);
	const [inputValue, setInputValue] = useState<string>('');
	const [editInputIndex, setEditInputIndex] = useState(-1);
	const [editInputValue, setEditInputValue] = useState('');
	const inputRef = useRef<InputRef>(null);
	const editInputRef = useRef<InputRef>(null);
	const { t } = useTranslation('alerts');

	useEffect(() => {
		if (inputVisible) {
			inputRef.current?.focus();
		}
	}, [inputVisible]);

	useEffect(() => {
		editInputRef.current?.focus();
	}, [inputValue]);

	const handleClose = (removedTag: string): void => {
		const newTags = tags.filter((tag) => tag !== removedTag);
		setTags(newTags);
	};

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
		setInputValue(e.target.value);
	};

	const handleInputConfirm = (): void => {
		if (inputValue && tags.indexOf(inputValue as never) === -1) {
			setTags([...tags, inputValue] as never);
		}
		setTagsListData(tags);
		setInputVisible(false);
		setInputValue('');
	};

	const handleEditInputChange = (
		e: React.ChangeEvent<HTMLInputElement>,
	): void => {
		setEditInputValue(e.target.value);
	};

	const handleEditInputConfirm = (): void => {
		const newTags = [...tags];
		newTags[editInputIndex] = editInputValue;
		setTags(newTags);
		setEditInputIndex(-1);
		setInputValue('');
	};

	const tagInputStyle: React.CSSProperties = {
		width: 78,
		verticalAlign: 'top',
		flex: 1,
	};

	const handleClearAll = (): void => {
		Modal.confirm({
			title: 'Confirm',
			icon: <ExclamationCircleOutlined />,
			content: t('remove_label_confirm'),
			onOk() {
				setTags([]);
				message.success(t('remove_label_success'));
			},
			okText: t('button_yes'),
			cancelText: t('button_no'),
		});
	};

	useEffect((): void => setTagsListData(tags), [setTagsListData, tags]);

	const showAllData: JSX.Element = (
		<>
			{tags.map((tag: string, index: number) => {
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
						onClose={(): void => handleClose(tag)}
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
			})}
		</>
	);

	return (
		<div style={{ display: 'flex', width: '100%' }}>
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
				prefix={showAllData}
			/>

			{tags.length || inputValue.length || inputValue ? (
				<Button onClick={handleClearAll} icon={<CloseCircleFilled />} type="text" />
			) : null}
		</div>
	);
}

export default TagInput;
