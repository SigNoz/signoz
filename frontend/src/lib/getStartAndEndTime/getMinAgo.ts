const getMinAgo = ({ minutes }: GetMinAgoProps): Date => {
	const currentDate = new Date();

	return new Date(currentDate.getTime() - minutes * 60000);
};

interface GetMinAgoProps {
	minutes: number;
}

export default getMinAgo;
