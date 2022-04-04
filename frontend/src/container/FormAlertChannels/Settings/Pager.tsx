import { Input } from 'antd';
import FormItem from 'antd/lib/form/FormItem';
import React from 'react';

import { PagerChannel } from '../../CreateAlertChannels/config';

const { TextArea } = Input;

function PagerForm({ setSelectedConfig }: PagerFormProps): JSX.Element {
	return (
		<>
			<FormItem name="routing_key" label="Routing Key" required>
				<Input
					onChange={(event): void => {
						setSelectedConfig((value) => ({
							...value,
							routing_key: event.target.value,
						}));
					}}
				/>
			</FormItem>

			<FormItem
				name="description"
				help="Shows up as description of incident"
				label="Description"
				required
			>
				<TextArea
					rows={4}
					onChange={(event): void =>
						setSelectedConfig((value) => ({
							...value,
							description: event.target.value,
						}))
					}
					placeholder="description"
				/>
			</FormItem>

			<FormItem
				name="severity"
				help="Severity of the incident, must be one of: must be one of the following: 'critical', 'warning', 'error' or 'info'"
				label="Severity"
			>
				<Input
					onChange={(event): void =>
						// todo: add validation
						setSelectedConfig((value) => ({
							...value,
							severity: event.target.value,
						}))
					}
				/>
			</FormItem>

			<FormItem
				name="details"
				help="Specify a key-value format (must be a valid json)"
				label="Additional Information"
			>
				<TextArea
					rows={4}
					onChange={(event): void =>
						setSelectedConfig((value) => ({
							...value,
							details: event.target.value,
						}))
					}
				/>
			</FormItem>

			<FormItem
				name="component"
				help="The part or component of the affected system that is broke"
				label="Component"
			>
				<Input
					onChange={(event): void =>
						setSelectedConfig((value) => ({
							...value,
							component: event.target.value,
						}))
					}
				/>
			</FormItem>

			<FormItem name="group" help="A cluster or grouping of sources" label="Group">
				<Input
					onChange={(event): void =>
						setSelectedConfig((value) => ({
							...value,
							group: event.target.value,
						}))
					}
				/>
			</FormItem>

			<FormItem name="class" help="The class/type of the event" label="Class">
				<Input
					onChange={(event): void =>
						setSelectedConfig((value) => ({
							...value,
							class: event.target.value,
						}))
					}
				/>
			</FormItem>
			<FormItem
				name="client"
				help="Shows up as event source in Pagerduty"
				label="Client"
			>
				<Input
					onChange={(event): void =>
						setSelectedConfig((value) => ({
							...value,
							client: event.target.value,
						}))
					}
				/>
			</FormItem>

			<FormItem
				name="client_url"
				help="Shows up as event source link in Pagerduty"
				label="Client URL"
			>
				<Input
					onChange={(event): void =>
						setSelectedConfig((value) => ({
							...value,
							client_url: event.target.value,
						}))
					}
				/>
			</FormItem>
		</>
	);
}

interface PagerFormProps {
	setSelectedConfig: React.Dispatch<React.SetStateAction<Partial<PagerChannel>>>;
}

export default PagerForm;
