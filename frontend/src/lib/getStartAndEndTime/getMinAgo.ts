const getMinAgo = ({ minutes }: getMinAgoProps): Date => {
	const currentDate = new Date();

	return new Date(currentDate.getTime() - minutes * 60000);
};

interface getMinAgoProps {
	minutes: number;
}

export default getMinAgo;
