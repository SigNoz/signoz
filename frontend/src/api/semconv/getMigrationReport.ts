import axios from 'api';
import { SemconvMigrationReport } from 'types/api/semconvMigration';

async function getSemconvMigrationReport(): Promise<SemconvMigrationReport> {
	const response = await axios.get('/fields/semconv-migration');
	return response.data.data;
}

export default getSemconvMigrationReport;
