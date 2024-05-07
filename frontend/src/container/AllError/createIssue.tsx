/* eslint-disable */
import { Button } from 'antd';
import axios from 'api';
import dayjs from 'dayjs';
import axiosRef from 'axios';

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
		try {
			const { data } = await axiosRef.post(
				`${process.env.SERVER_API_HOST}/capi/jira/createIssue`,
				{
					// type: 'Bug',
					serviceName: record.serviceName,
					exceptionType: record.exceptionType,
					title: record.exceptionMessage,
					message: record.exceptionMessage,
					// time: dayjs(record.lastSeen).format('YYYY-MM-DD HH:mm:ss'),
					time: record.lastSeen,
					errorId: record.groupID,
				},
				{
					headers: {
						// 'Content-Type': 'application/json',
						authorization: 'Basic emhpY2hhby5nYW9Ac2F5d2VlZS5jb206emhpY2hhby5nYW8=',
					},
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
