import { Input, Select } from 'antd';
import FormItem from 'antd/lib/form/FormItem';
import { LabelFilterStatement } from 'container/CreateAlertChannels/config';
import React from 'react';

const { Option } = Select;

function LabelFilterForm({ setFilter }: LabelFilterProps): JSX.Element {
	return (
		<FormItem name="label_filter" label="Notify When (Optional)">
			<Input.Group compact>
				<Select
					defaultValue="Severity"
					style={{ width: '15%' }}
					onChange={(event): void => {
						setFilter((value) => {
							const first: LabelFilterStatement = value[0] as LabelFilterStatement;
							first.name = event;
							return [first];
						});
					}}
				>
					<Option value="severity">Severity</Option>
					<Option value="service">Service</Option>
				</Select>
				<Select
					defaultValue="="
					onChange={(event): void => {
						setFilter((value) => {
							const first: LabelFilterStatement = value[0] as LabelFilterStatement;
							first.comparator = event;
							return [first];
						});
					}}
				>
					<Option value="=">=</Option>
					<Option value="!=">!=</Option>
				</Select>
				<Input
					style={{ width: '20%' }}
					placeholder="enter a text here"
					onChange={(event): void => {
						setFilter((value) => {
							const first: LabelFilterStatement = value[0] as LabelFilterStatement;
							first.value = event.target.value;
							return [first];
						});
					}}
				/>
			</Input.Group>
		</FormItem>
	);
}

export interface LabelFilterProps {
	setFilter: React.Dispatch<
		React.SetStateAction<Partial<Array<LabelFilterStatement>>>
	>;
}

export default LabelFilterForm;
