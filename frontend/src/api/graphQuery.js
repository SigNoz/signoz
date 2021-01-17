import axios from "axios";

// No auth for the API
export default axios.create({
	baseURL: "https://api.signoz.io/api/prom/api/v1",
});
