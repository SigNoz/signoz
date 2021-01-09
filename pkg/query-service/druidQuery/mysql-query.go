package druidQuery

import (
	"encoding/json"
	"fmt"
	"time"

	"go.signoz.io/query-service/constants"
	"go.signoz.io/query-service/model"
	"go.uber.org/zap"
)

type ServiceItem struct {
	ServiceName  string  `json:"serviceName"`
	Percentile99 float32 `json:"p99"`
	AvgDuration  float32 `json:"avgDuration"`
	NumCalls     int     `json:"numCalls"`
	CallRate     float32 `json:"callRate"`
	NumErrors    int     `json:"numErrors"`
	ErrorRate    float32 `json:"errorRate"`
}

type ServiceOverviewItem struct {
	Time         string  `json:"time,omitempty"`
	Timestamp    int64   `json:"timestamp"`
	Percentile50 float32 `json:"p50"`
	Percentile90 float32 `json:"p90"`
	Percentile99 float32 `json:"p99"`
	NumCalls     int     `json:"numCalls"`
	CallRate     float32 `json:"callRate"`
	NumErrors    int     `json:"numErrors"`
	ErrorRate    float32 `json:"errorRate"`
}

type UsageItem struct {
	Time      string `json:"time,omitempty"`
	Timestamp int64  `json:"timestamp"`
	Count     int64  `json:"count"`
}

type TopEnpointsItem struct {
	Percentile50 float32 `json:"p50"`
	Percentile90 float32 `json:"p90"`
	Percentile99 float32 `json:"p99"`
	NumCalls     int     `json:"numCalls"`
	Name         string  `json:"name"`
}

type TagItem struct {
	TagKeys  string `json:"tagKeys"`
	TagCount int    `json:"tagCount"`
}

func GetOperations(client *SqlClient, serviceName string) (*[]string, error) {

	sqlQuery := fmt.Sprintf(`SELECT DISTINCT(Name) FROM %s WHERE ServiceName='%s' AND __time > CURRENT_TIMESTAMP - INTERVAL '2' DAY`, constants.DruidDatasource, serviceName)
	// zap.S().Debug(sqlQuery)

	response, err := client.Query(sqlQuery, "array")

	if err != nil {
		zap.S().Error(sqlQuery, err)
		return nil, fmt.Errorf("Something went wrong in druid query")
	}

	// zap.S().Info(string(response))

	res := new([][]string)
	err = json.Unmarshal(response, res)
	if err != nil {
		zap.S().Error(err)
		return nil, fmt.Errorf("Error in unmarshalling response from druid")
	}

	var getOperationsReponse []string
	for _, item := range *res {
		getOperationsReponse = append(getOperationsReponse, item[0])
	}
	getOperationsReponse = getOperationsReponse[1:]
	return &getOperationsReponse, nil
}

func GetServicesList(client *SqlClient) (*[]string, error) {

	sqlQuery := fmt.Sprintf(`SELECT DISTINCT(ServiceName) FROM %s`, constants.DruidDatasource)
	// zap.S().Debug(sqlQuery)

	response, err := client.Query(sqlQuery, "array")

	if err != nil {
		zap.S().Error(sqlQuery, err)
		return nil, fmt.Errorf("Something went wrong in druid query")
	}

	// zap.S().Info(string(response))

	res := new([][]string)
	err = json.Unmarshal(response, res)
	if err != nil {
		zap.S().Error(err)
		return nil, fmt.Errorf("Error in unmarshalling response from druid")
	}

	var servicesListReponse []string
	for _, item := range *res {
		servicesListReponse = append(servicesListReponse, item[0])
	}
	servicesListReponse = servicesListReponse[1:]
	return &servicesListReponse, nil
}

func GetTags(client *SqlClient, serviceName string) (*[]TagItem, error) {

	var sqlQuery string

	if len(serviceName) != 0 {
		sqlQuery = fmt.Sprintf(`SELECT TagsKeys as tagKeys,  Count(TagsKeys) as  "tagCount" FROM %s  WHERE "ServiceName"='%s' AND "__time" > CURRENT_TIMESTAMP -  INTERVAL '1' DAY GROUP BY TagsKeys ORDER BY tagCount DESC LIMIT 100`, constants.DruidDatasource, serviceName)
	} else {
		sqlQuery = fmt.Sprintf(`SELECT TagsKeys as tagKeys,  Count(TagsKeys) as  "tagCount" FROM %s  WHERE "__time" > CURRENT_TIMESTAMP -  INTERVAL '1' DAY GROUP BY TagsKeys ORDER BY tagCount DESC LIMIT 100`, constants.DruidDatasource)
	}

	// zap.S().Debug(sqlQuery)

	response, err := client.Query(sqlQuery, "object")

	if err != nil {
		zap.S().Error(sqlQuery, err)
		return nil, fmt.Errorf("Something went wrong in druid query")
	}

	// zap.S().Info(string(response))

	res := new([]TagItem)
	err = json.Unmarshal(response, res)
	if err != nil {
		zap.S().Error(err)
		return nil, fmt.Errorf("Error in unmarshalling response from druid")
	}

	tagResponse := (*res)[1:]
	return &tagResponse, nil
}

func GetTopEndpoints(client *SqlClient, query *model.GetTopEndpointsParams) (*[]TopEnpointsItem, error) {

	sqlQuery := fmt.Sprintf(`SELECT APPROX_QUANTILE_DS("QuantileDuration", 0.5) as p50, APPROX_QUANTILE_DS("QuantileDuration", 0.9) as p90, APPROX_QUANTILE_DS("QuantileDuration", 0.99) as p99, COUNT(SpanId) as numCalls, Name  FROM "%s" WHERE  "__time" >= TIMESTAMP '%s' AND "__time" <= TIMESTAMP '%s' AND  "Kind"='2' and "ServiceName"='%s' GROUP BY Name`, constants.DruidDatasource, query.StartTime, query.EndTime, query.ServiceName)

	// zap.S().Debug(sqlQuery)

	response, err := client.Query(sqlQuery, "object")

	if err != nil {
		zap.S().Error(query, err)
		return nil, fmt.Errorf("Something went wrong in druid query")
	}

	// zap.S().Info(string(response))

	res := new([]TopEnpointsItem)
	err = json.Unmarshal(response, res)
	if err != nil {
		zap.S().Error(err)
		return nil, fmt.Errorf("Error in unmarshalling response from druid")
	}

	topEnpointsResponse := (*res)[1:]
	return &topEnpointsResponse, nil
}

func GetUsage(client *SqlClient, query *model.GetUsageParams) (*[]UsageItem, error) {

	var sqlQuery string

	if len(query.ServiceName) != 0 {

		sqlQuery = fmt.Sprintf(`SELECT TIME_FLOOR(__time,  '%s') as "time", COUNT(SpanId) as "count" FROM "%s" WHERE "__time" >= TIMESTAMP '%s' and "__time" <= TIMESTAMP '%s'  and "ServiceName"='%s' GROUP BY TIME_FLOOR(__time,  '%s')`, query.Period, constants.DruidDatasource, query.StartTime, query.EndTime, query.ServiceName, query.Period)

	} else {
		sqlQuery = fmt.Sprintf(`SELECT TIME_FLOOR(__time,  '%s') as "time", COUNT(SpanId) as "count" FROM "%s" WHERE "__time" >= TIMESTAMP '%s' and "__time" <= TIMESTAMP '%s' GROUP BY TIME_FLOOR(__time,  '%s')`, query.Period, constants.DruidDatasource, query.StartTime, query.EndTime, query.Period)
	}

	// zap.S().Debug(sqlQuery)

	response, err := client.Query(sqlQuery, "object")

	if err != nil {
		zap.S().Error(query, err)
		return nil, fmt.Errorf("Something went wrong in druid query")
	}

	// zap.S().Info(string(response))

	res := new([]UsageItem)
	err = json.Unmarshal(response, res)
	if err != nil {
		zap.S().Error(err)
		return nil, fmt.Errorf("Error in unmarshalling response from druid")
	}

	for i, _ := range *res {
		timeObj, _ := time.Parse(time.RFC3339Nano, (*res)[i].Time)
		(*res)[i].Timestamp = int64(timeObj.UnixNano())
		(*res)[i].Time = ""
	}

	usageResponse := (*res)[1:]
	return &usageResponse, nil
}

func GetServiceOverview(client *SqlClient, query *model.GetServiceOverviewParams) (*[]ServiceOverviewItem, error) {

	sqlQuery := fmt.Sprintf(`SELECT TIME_FLOOR(__time,  '%s') as "time", APPROX_QUANTILE_DS("QuantileDuration", 0.5) as p50, APPROX_QUANTILE_DS("QuantileDuration", 0.9) as p90, 
	APPROX_QUANTILE_DS("QuantileDuration", 0.99) as p99, COUNT("SpanId") as "numCalls" FROM "%s" WHERE "__time" >= TIMESTAMP '%s' and "__time" <= TIMESTAMP '%s'  and "Kind"='2' and "ServiceName"='%s' GROUP BY TIME_FLOOR(__time,  '%s') `, query.Period, constants.DruidDatasource, query.StartTime, query.EndTime, query.ServiceName, query.Period)

	// zap.S().Debug(sqlQuery)

	response, err := client.Query(sqlQuery, "object")

	if err != nil {
		zap.S().Error(query, err)
		return nil, fmt.Errorf("Something went wrong in druid query")
	}

	// zap.S().Info(string(response))

	res := new([]ServiceOverviewItem)
	err = json.Unmarshal(response, res)
	if err != nil {
		zap.S().Error(err)
		return nil, fmt.Errorf("Error in unmarshalling response from druid")
	}

	for i, _ := range *res {
		timeObj, _ := time.Parse(time.RFC3339Nano, (*res)[i].Time)
		(*res)[i].Timestamp = int64(timeObj.UnixNano())
		(*res)[i].Time = ""
		(*res)[i].ErrorRate = float32((*res)[i].NumErrors) / float32(query.StepSeconds)
		(*res)[i].CallRate = float32((*res)[i].NumCalls) / float32(query.StepSeconds)

	}

	servicesOverviewResponse := (*res)[1:]
	return &servicesOverviewResponse, nil
}

func GetServices(client *SqlClient, query *model.GetServicesParams) (*[]ServiceItem, error) {

	sqlQuery := fmt.Sprintf(`SELECT APPROX_QUANTILE_DS("QuantileDuration", 0.99) as "p99", AVG("DurationNano") as "avgDuration", COUNT(SpanId) as numCalls, "ServiceName" as "serviceName" FROM %s WHERE "__time" >= TIMESTAMP '%s' and "__time" <= TIMESTAMP '%s' and "Kind"='2' GROUP BY "ServiceName" ORDER BY "p99" DESC`, constants.DruidDatasource, query.StartTime, query.EndTime)

	response, err := client.Query(sqlQuery, "object")

	// zap.S().Debug(sqlQuery)

	if err != nil {
		zap.S().Error(query, err)
		return nil, fmt.Errorf("Something went wrong in druid query")
	}

	// zap.S().Info(string(response))

	res := new([]ServiceItem)
	err = json.Unmarshal(response, res)
	if err != nil {
		zap.S().Error(err)
		return nil, fmt.Errorf("Error in unmarshalling response from druid")
	}

	for i, _ := range *res {

		(*res)[i].ErrorRate = float32((*res)[i].NumErrors) / float32(query.Period)
		(*res)[i].CallRate = float32((*res)[i].NumCalls) / float32(query.Period)

	}
	servicesResponse := (*res)[1:]
	return &servicesResponse, nil
}
