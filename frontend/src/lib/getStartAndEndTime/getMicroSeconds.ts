const getMicroSeconds = ({ time }: GetMicroSecondsProps): string => {
	return (time / 1000).toString();
};

interface GetMicroSecondsProps {
	time: number;
}

export default getMicroSeconds;
