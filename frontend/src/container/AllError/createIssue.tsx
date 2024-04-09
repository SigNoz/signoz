/* eslint-disable */
import { Button } from 'antd';
import axios from 'api';

interface CreateIssueProp {
	issueLink: string;
	record: any;
	refresh?: () => void;
}

function CreateIssue(props: CreateIssueProp): JSX.Element {
	const updateIssueLink = (value: string, groupID: string) => {
		axios
			.post(`/updateIssueLink`, {
				groupID,
				issueLink: value,
			})
			.then(({ data }) => {
				if (data) {
					setTimeout(() => {
						props.refresh && props.refresh();
					}, 800);
					return;
				}
			})
			.catch((error) => {
				console.warn('updateIssueLink', error);
			});
	};

	const handleCreateIssue = async (record: any) => {
		console.log('record', record);
		try {
			const { data } = await axios.post(
				`${process.env.SERVER_API_HOST}/capi/jira/createIssue`,
				{
					type: 'Bug',
					serviceName: record.serviceName,
					exceptionType: record.exceptionType,
					exceptionMessage: record.exceptionMessage,
					time: record.lastSeen,
					groupID: record.groupID,
				},
			);
			console.log('data', data);
			if (data.result && data?.data?.issue_key) {
				const linkUrl = `${process.env.JIRA_HOST}/browse/${data?.data?.issue_key}`;
				updateIssueLink(linkUrl, record.groupID);
			}
		} catch (error) {
			console.warn('handleCreateIssueError', error);
		}
	};

	return (
		<>
			{props.issueLink ? (
				<Button type="link" href={props.issueLink} target="_blank">
					Issue Link
				</Button>
			) : (
				<Button type="primary" onClick={() => handleCreateIssue(props.record)}>
					Create Issue
				</Button>
			)}
		</>
	);
}
export default CreateIssue;
