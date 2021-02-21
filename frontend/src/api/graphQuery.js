import axios from "axios";
import { ENVIRONMENT } from "../constants/env";
import {Token} from "../utils/token";

// No auth for the API
export default axios.create({
	baseURL: `${ENVIRONMENT.baseURL}/api/prom/api/v1`
});
