import { PlusOutlined } from '@ant-design/icons';
import { Tooltip } from 'antd';
import { Dispatch, SetStateAction, useState } from 'react';

import {
	InputContainer,
	NewTagContainer,
	StyledInput,
	StyledTag,
	TagsContainer,
} from './styles';

function AddTags({ tags, setTags }: AddTagsProps): JSX.Element {
	const [inputValue, setInputValue] = useState<string>('');
	const [inputVisible, setInputVisible] = useState<boolean>(false);
	const [editInputIndex, setEditInputIndex] = useState(-1);
	const [editInputValue, setEditInputValue] = useState('');

	const handleInputConfirm = (): void => {
		if (inputValue) {
			setTags([...tags, inputValue]);
		}
		setInputVisible(false);
		setInputValue('');
	};

	const handleEditInputConfirm = (): void => {
		const newTags = [...tags];
		newTags[editInputIndex] = editInputValue;
		setTags(newTags);
		setEditInputIndex(-1);
		setInputValue('');
	};

	const handleClose = (removedTag: string): void => {
		const newTags = tags.filter((tag) => tag !== removedTag);
		setTags(newTags);
	};

	const showInput = (): void => {
		setInputVisible(true);
	};

	const onChangeHandler = (
		value: string,
		func: Dispatch<SetStateAction<string>>,
	): void => {
		func(value);
	};

	return (
		<TagsContainer>
			{tags.map((tag, index) => {
				if (editInputIndex === index) {
					return (
						<InputContainer key={tag} lg={4}>
							<StyledInput
								type="text"
								size="small"
								value={editInputValue}
								autoFocus
								onChange={(event): void =>
									onChangeHandler(event.target.value, setEditInputValue)
								}
								onBlur={handleEditInputConfirm}
								onPressEnter={handleEditInputConfirm}
							/>
						</InputContainer>
					);
				}

				const isLongTag = tag.length > 20;

				const tagElem = (
					<StyledTag closable key={tag} onClose={(): void => handleClose(tag)}>
						<span
							onDoubleClick={(e): void => {
								setEditInputIndex(index);
								setEditInputValue(tag);
								e.preventDefault();
							}}
						>
							{isLongTag ? `${tag.slice(0, 20)}...` : tag}
						</span>
					</StyledTag>
				);

				return isLongTag ? (
					<Tooltip title={tag} key={tag}>
						{tagElem}
					</Tooltip>
				) : (
					tagElem
				);
			})}

			{inputVisible && (
				<InputContainer lg={4}>
					<StyledInput
						type="text"
						size="small"
						value={inputValue}
						autoFocus
						onChange={(event): void =>
							onChangeHandler(event.target.value, setInputValue)
						}
						onBlur={handleInputConfirm}
						onPressEnter={handleInputConfirm}
					/>
				</InputContainer>
			)}

			{!inputVisible && (
				<NewTagContainer icon={<PlusOutlined />} onClick={showInput}>
					<span>New Tag</span>
				</NewTagContainer>
			)}
		</TagsContainer>
	);
}

interface AddTagsProps {
	tags: string[];
	setTags: Dispatch<SetStateAction<string[]>>;
}

export default AddTags;
