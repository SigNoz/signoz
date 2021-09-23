const getMinAgo = ({ minutes }: getMinAgoProps): Date => {
	const currentDate = new Date();

	const agoDate = new Date(currentDate.getTime() - minutes * 60000);

	return agoDate;
};

interface getMinAgoProps {
	minutes: number;
}

export default getMinAgo;
