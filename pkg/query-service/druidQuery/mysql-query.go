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
	Num4XX       int     `json:"num4XX"`
	FourXXRate   float32 `json:"fourXXRate"`
}
type ServiceListErrorItem struct {
	ServiceName string `json:"serviceName"`
	NumErrors   int    `json:"numErrors"`
	Num4xx      int    `json:"num4xx"`
}

type ServiceErrorItem struct {
	Time      string `json:"time,omitempty"`
	Timestamp int64  `json:"timestamp"`
	NumErrors int    `json:"numErrors"`
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

type ServiceExternalItem struct {
	Time            string  `json:"time,omitempty"`
	Timestamp       int64   `json:"timestamp,omitempty"`
	ExternalHttpUrl string  `json:"externalHttpUrl,omitempty"`
	AvgDuration     float32 `json:"avgDuration,omitempty"`
	NumCalls        int     `json:"numCalls,omitempty"`
	CallRate        float32 `json:"callRate,omitempty"`
	NumErrors       int     `json:"numErrors"`
	ErrorRate       float32 `json:"errorRate"`
}

type ServiceDBOverviewItem struct {
	Time        string  `json:"time,omitempty"`
	Timestamp   int64   `json:"timestamp,omitempty"`
	DBSystem    string  `json:"dbSystem,omitempty"`
	AvgDuration float32 `json:"avgDuration,omitempty"`
	NumCalls    int     `json:"numCalls,omitempty"`
	CallRate    float32 `json:"callRate,omitempty"`
}

type ServiceMapDependencyItem struct {
	SpanId       string `json:"spanId,omitempty"`
	ParentSpanId string `json:"parentSpanId,omitempty"`
	ServiceName  string `json:"serviceName,omitempty"`
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

type ServiceMapDependencyResponseItem struct {
	Parent    string `json:"parent,omitempty"`
	Child     string `json:"child,omitempty"`
	CallCount int    `json:"callCount,omitempty"`
}

func GetOperations(client *SqlClient, serviceName string) (*[]string, error) {

	sqlQuery := fmt.Sprintf(`SELECT DISTINCT(Name) FROM %s WHERE ServiceName='%s' AND __time > CURRENT_TIMESTAMP - INTERVAL '1' DAY`, constants.DruidDatasource, serviceName)
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

	sqlQuery := fmt.Sprintf(`SELECT DISTINCT(ServiceName) FROM %s WHERE __time > CURRENT_TIMESTAMP - INTERVAL '1' DAY`, constants.DruidDatasource)
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

	sqlQuery := fmt.Sprintf(`SELECT APPROX_QUANTILE_DS("QuantileDuration", 0.5) as p50, APPROX_QUANTILE_DS("QuantileDuration", 0.9) as p90, APPROX_QUANTILE_DS("QuantileDuration", 0.99) as p99, COUNT(SpanId) as numCalls, Name  FROM "%s" WHERE  "__time" >= '%s' AND "__time" <= '%s' AND  "Kind"='2' and "ServiceName"='%s' GROUP BY Name`, constants.DruidDatasource, query.StartTime, query.EndTime, query.ServiceName)

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

		sqlQuery = fmt.Sprintf(`SELECT TIME_FLOOR(__time,  '%s') as "time", COUNT(SpanId) as "count" FROM "%s" WHERE "__time" >= '%s' and "__time" <= '%s'  and "ServiceName"='%s' GROUP BY TIME_FLOOR(__time,  '%s')`, query.Period, constants.DruidDatasource, query.StartTime, query.EndTime, query.ServiceName, query.Period)

	} else {
		sqlQuery = fmt.Sprintf(`SELECT TIME_FLOOR(__time,  '%s') as "time", COUNT(SpanId) as "count" FROM "%s" WHERE "__time" >= '%s' and "__time" <= '%s' GROUP BY TIME_FLOOR(__time,  '%s')`, query.Period, constants.DruidDatasource, query.StartTime, query.EndTime, query.Period)
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

func GetServiceExternalAvgDuration(client *SqlClient, query *model.GetServiceOverviewParams) (*[]ServiceExternalItem, error) {

	sqlQuery := fmt.Sprintf(`SELECT TIME_FLOOR(__time,  '%s') as "time", AVG(DurationNano) as "avgDuration" FROM %s WHERE ServiceName='%s' AND Kind='3' AND ExternalHttpUrl != '' AND "__time" >= '%s' AND "__time" <= '%s'
	GROUP BY TIME_FLOOR(__time,  '%s')`, query.Period, constants.DruidDatasource, query.ServiceName, query.StartTime, query.EndTime, query.Period)

	// zap.S().Debug(sqlQuery)

	response, err := client.Query(sqlQuery, "object")

	if err != nil {
		zap.S().Error(query, err)
		return nil, fmt.Errorf("Something went wrong in druid query")
	}

	// responseStr := string(response)
	// zap.S().Info(responseStr)

	res := new([]ServiceExternalItem)
	err = json.Unmarshal(response, res)
	if err != nil {
		zap.S().Error(err)
		return nil, fmt.Errorf("Error in unmarshalling response from druid")
	}

	for i, _ := range *res {
		timeObj, _ := time.Parse(time.RFC3339Nano, (*res)[i].Time)
		(*res)[i].Timestamp = int64(timeObj.UnixNano())
		(*res)[i].Time = ""
		(*res)[i].CallRate = float32((*res)[i].NumCalls) / float32(query.StepSeconds)

	}

	servicesExternalResponse := (*res)[1:]
	return &servicesExternalResponse, nil
}

func GetServiceExternalErrors(client *SqlClient, query *model.GetServiceOverviewParams) (*[]ServiceExternalItem, error) {

	sqlQuery := fmt.Sprintf(`SELECT TIME_FLOOR(__time,  '%s') as "time", COUNT(SpanId) as "numCalls", ExternalHttpUrl as externalHttpUrl FROM %s WHERE ServiceName='%s' AND Kind='3' AND ExternalHttpUrl != '' AND StatusCode >= 500 AND "__time" >= '%s' AND "__time" <= '%s'
	GROUP BY TIME_FLOOR(__time,  '%s'), ExternalHttpUrl`, query.Period, constants.DruidDatasource, query.ServiceName, query.StartTime, query.EndTime, query.Period)

	// zap.S().Debug(sqlQuery)

	response, err := client.Query(sqlQuery, "object")

	if err != nil {
		zap.S().Error(query, err)
		return nil, fmt.Errorf("Something went wrong in druid query")
	}

	// responseStr := string(response)
	// zap.S().Info(responseStr)

	res := new([]ServiceExternalItem)
	err = json.Unmarshal(response, res)
	if err != nil {
		zap.S().Error(err)
		return nil, fmt.Errorf("Error in unmarshalling response from druid")
	}

	sqlQuery = fmt.Sprintf(`SELECT TIME_FLOOR(__time,  '%s') as "time", COUNT(SpanId) as "numCalls", ExternalHttpUrl as externalHttpUrl FROM %s WHERE ServiceName='%s' AND Kind='3' AND ExternalHttpUrl != '' AND "__time" >= '%s' AND "__time" <= '%s'
	GROUP BY TIME_FLOOR(__time,  '%s'), ExternalHttpUrl`, query.Period, constants.DruidDatasource, query.ServiceName, query.StartTime, query.EndTime, query.Period)

	// zap.S().Debug(sqlQuery)

	responseTotal, err := client.Query(sqlQuery, "object")

	if err != nil {
		zap.S().Error(query, err)
		return nil, fmt.Errorf("Something went wrong in druid query")
	}

	// responseStr := string(response)
	// zap.S().Info(responseStr)

	resTotal := new([]ServiceExternalItem)
	err = json.Unmarshal(responseTotal, resTotal)
	if err != nil {
		zap.S().Error(err)
		return nil, fmt.Errorf("Error in unmarshalling response from druid")
	}

	m := make(map[int64]int)

	for j, _ := range *res {
		timeObj, _ := time.Parse(time.RFC3339Nano, (*res)[j].Time)
		m[int64(timeObj.UnixNano())] = (*res)[j].NumCalls
	}

	for i, _ := range *resTotal {
		timeObj, _ := time.Parse(time.RFC3339Nano, (*resTotal)[i].Time)
		(*resTotal)[i].Timestamp = int64(timeObj.UnixNano())
		(*resTotal)[i].Time = ""
		(*resTotal)[i].CallRate = float32((*resTotal)[i].NumCalls) / float32(query.StepSeconds)

		if val, ok := m[(*resTotal)[i].Timestamp]; ok {
			(*resTotal)[i].NumErrors = val
			(*resTotal)[i].ErrorRate = float32((*resTotal)[i].NumErrors) * 100 / float32((*resTotal)[i].NumCalls)
		}
		(*resTotal)[i].CallRate = 0
		(*resTotal)[i].NumCalls = 0

	}

	servicesExternalResponse := (*resTotal)[1:]
	return &servicesExternalResponse, nil
}

func GetServiceExternal(client *SqlClient, query *model.GetServiceOverviewParams) (*[]ServiceExternalItem, error) {

	sqlQuery := fmt.Sprintf(`SELECT TIME_FLOOR(__time,  '%s') as "time", AVG(DurationNano) as "avgDuration", COUNT(SpanId) as "numCalls", ExternalHttpUrl as externalHttpUrl FROM %s WHERE ServiceName='%s' AND Kind='3' AND ExternalHttpUrl != ''
	AND "__time" >= '%s' AND "__time" <= '%s'
	GROUP BY TIME_FLOOR(__time,  '%s'), ExternalHttpUrl`, query.Period, constants.DruidDatasource, query.ServiceName, query.StartTime, query.EndTime, query.Period)

	// zap.S().Debug(sqlQuery)

	response, err := client.Query(sqlQuery, "object")

	if err != nil {
		zap.S().Error(query, err)
		return nil, fmt.Errorf("Something went wrong in druid query")
	}

	// responseStr := string(response)
	// zap.S().Info(responseStr)

	res := new([]ServiceExternalItem)
	err = json.Unmarshal(response, res)
	if err != nil {
		zap.S().Error(err)
		return nil, fmt.Errorf("Error in unmarshalling response from druid")
	}

	for i, _ := range *res {
		timeObj, _ := time.Parse(time.RFC3339Nano, (*res)[i].Time)
		(*res)[i].Timestamp = int64(timeObj.UnixNano())
		(*res)[i].Time = ""
		(*res)[i].CallRate = float32((*res)[i].NumCalls) / float32(query.StepSeconds)

	}

	servicesExternalResponse := (*res)[1:]
	return &servicesExternalResponse, nil
}

func GetServiceDBOverview(client *SqlClient, query *model.GetServiceOverviewParams) (*[]ServiceDBOverviewItem, error) {

	sqlQuery := fmt.Sprintf(`SELECT TIME_FLOOR(__time,  '%s') as "time", AVG(DurationNano) as "avgDuration", COUNT(SpanId) as "numCalls", DBSystem as "dbSystem" FROM %s WHERE ServiceName='%s' AND Kind='3' AND DBName IS NOT NULL
	AND "__time" >= '%s' AND "__time" <= '%s'
	GROUP BY TIME_FLOOR(__time,  '%s'), DBSystem`, query.Period, constants.DruidDatasource, query.ServiceName, query.StartTime, query.EndTime, query.Period)

	// zap.S().Debug(sqlQuery)

	response, err := client.Query(sqlQuery, "object")

	if err != nil {
		zap.S().Error(query, err)
		return nil, fmt.Errorf("Something went wrong in druid query")
	}

	// responseStr := string(response)
	// zap.S().Info(responseStr)

	res := new([]ServiceDBOverviewItem)
	err = json.Unmarshal(response, res)
	if err != nil {
		zap.S().Error(err)
		return nil, fmt.Errorf("Error in unmarshalling response from druid")
	}

	for i, _ := range *res {
		timeObj, _ := time.Parse(time.RFC3339Nano, (*res)[i].Time)
		(*res)[i].Timestamp = int64(timeObj.UnixNano())
		(*res)[i].Time = ""
		(*res)[i].CallRate = float32((*res)[i].NumCalls) / float32(query.StepSeconds)

	}

	servicesDBOverviewResponse := (*res)[1:]
	return &servicesDBOverviewResponse, nil
}

func GetServiceOverview(client *SqlClient, query *model.GetServiceOverviewParams) (*[]ServiceOverviewItem, error) {

	sqlQuery := fmt.Sprintf(`SELECT TIME_FLOOR(__time,  '%s') as "time", APPROX_QUANTILE_DS("QuantileDuration", 0.5) as p50, APPROX_QUANTILE_DS("QuantileDuration", 0.9) as p90, 
	APPROX_QUANTILE_DS("QuantileDuration", 0.99) as p99, COUNT("SpanId") as "numCalls" FROM "%s" WHERE "__time" >= '%s' and "__time" <= '%s'  and "Kind"='2' and "ServiceName"='%s' GROUP BY TIME_FLOOR(__time,  '%s') `, query.Period, constants.DruidDatasource, query.StartTime, query.EndTime, query.ServiceName, query.Period)

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

	sqlQuery = fmt.Sprintf(`SELECT TIME_FLOOR(__time,  '%s') as "time", COUNT("SpanId") as "numErrors" FROM "%s" WHERE "__time" >= '%s' and "__time" <= '%s'  and "Kind"='2' and "ServiceName"='%s' and "StatusCode">=500 GROUP BY TIME_FLOOR(__time,  '%s') `, query.Period, constants.DruidDatasource, query.StartTime, query.EndTime, query.ServiceName, query.Period)

	// zap.S().Debug(sqlQuery)

	responseError, err := client.Query(sqlQuery, "object")

	if err != nil {
		zap.S().Error(query, err)
		return nil, fmt.Errorf("Something went wrong in druid query")
	}

	// zap.S().Info(string(response))

	resError := new([]ServiceErrorItem)
	err = json.Unmarshal(responseError, resError)
	if err != nil {
		zap.S().Error(err)
		return nil, fmt.Errorf("Error in unmarshalling response from druid")
	}

	m := make(map[int64]int)

	for j, _ := range *resError {
		timeObj, _ := time.Parse(time.RFC3339Nano, (*resError)[j].Time)
		m[int64(timeObj.UnixNano())] = (*resError)[j].NumErrors
	}

	for i, _ := range *res {
		timeObj, _ := time.Parse(time.RFC3339Nano, (*res)[i].Time)
		(*res)[i].Timestamp = int64(timeObj.UnixNano())
		(*res)[i].Time = ""
		if val, ok := m[(*res)[i].Timestamp]; ok {
			(*res)[i].NumErrors = val
		}
		(*res)[i].ErrorRate = float32((*res)[i].NumErrors) * 100 / float32((*res)[i].NumCalls)
		(*res)[i].CallRate = float32((*res)[i].NumCalls) / float32(query.StepSeconds)

	}

	servicesOverviewResponse := (*res)[1:]
	return &servicesOverviewResponse, nil
}

func GetServices(client *SqlClient, query *model.GetServicesParams) (*[]ServiceItem, error) {

	sqlQuery := fmt.Sprintf(`SELECT APPROX_QUANTILE_DS("QuantileDuration", 0.99) as "p99", AVG("DurationNano") as "avgDuration", COUNT(SpanId) as numCalls, "ServiceName" as "serviceName" FROM %s WHERE "__time" >= '%s' and "__time" <= '%s' and "Kind"='2' GROUP BY "ServiceName" ORDER BY "p99" DESC`, constants.DruidDatasource, query.StartTime, query.EndTime)

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

	//////////////////		Below block gets 5xx of services

	sqlQuery = fmt.Sprintf(`SELECT COUNT(SpanId) as numErrors, "ServiceName" as "serviceName" FROM %s WHERE "__time" >= '%s' and "__time" <= '%s' and "Kind"='2' and "StatusCode">=500 GROUP BY "ServiceName"`, constants.DruidDatasource, query.StartTime, query.EndTime)

	responseError, err := client.Query(sqlQuery, "object")

	// zap.S().Debug(sqlQuery)

	if err != nil {
		zap.S().Error(query, err)
		return nil, fmt.Errorf("Something went wrong in druid query")
	}

	// zap.S().Info(string(response))

	resError := new([]ServiceListErrorItem)
	err = json.Unmarshal(responseError, resError)
	if err != nil {
		zap.S().Error(err)
		return nil, fmt.Errorf("Error in unmarshalling response from druid")
	}

	m := make(map[string]int)

	for j, _ := range *resError {
		m[(*resError)[j].ServiceName] = (*resError)[j].NumErrors
	}

	///////////////////////////////////////////

	//////////////////		Below block gets 4xx of services

	sqlQuery = fmt.Sprintf(`SELECT COUNT(SpanId) as numErrors, "ServiceName" as "serviceName" FROM %s WHERE "__time" >= '%s' and "__time" <= '%s' and "Kind"='2' and "StatusCode">=400 and "StatusCode" < 500 GROUP BY "ServiceName"`, constants.DruidDatasource, query.StartTime, query.EndTime)

	response4xx, err := client.Query(sqlQuery, "object")

	// zap.S().Debug(sqlQuery)

	if err != nil {
		zap.S().Error(query, err)
		return nil, fmt.Errorf("Something went wrong in druid query")
	}

	// zap.S().Info(string(response))

	res4xx := new([]ServiceListErrorItem)
	err = json.Unmarshal(response4xx, res4xx)
	if err != nil {
		zap.S().Error(err)
		return nil, fmt.Errorf("Error in unmarshalling response from druid")
	}

	m4xx := make(map[string]int)

	for j, _ := range *res4xx {
		m4xx[(*res4xx)[j].ServiceName] = (*res4xx)[j].Num4xx
	}

	///////////////////////////////////////////

	for i, _ := range *res {

		if val, ok := m[(*res)[i].ServiceName]; ok {
			(*res)[i].NumErrors = val
		}
		if val, ok := m4xx[(*res)[i].ServiceName]; ok {
			(*res)[i].Num4XX = val
		}

		(*res)[i].FourXXRate = (float32((*res)[i].Num4XX) + 12) * 100 / float32((*res)[i].NumCalls)
		(*res)[i].ErrorRate = float32((*res)[i].NumErrors) * 100 / float32((*res)[i].NumCalls)
		(*res)[i].CallRate = float32((*res)[i].NumCalls) / float32(query.Period)

	}
	servicesResponse := (*res)[1:]
	return &servicesResponse, nil
}

func GetServiceMapDependencies(client *SqlClient, query *model.GetServicesParams) (*[]ServiceMapDependencyResponseItem, error) {

	sqlQuery := fmt.Sprintf(`SELECT SpanId, ParentSpanId, ServiceName FROM %s WHERE "__time" >= '%s' AND "__time" <= '%s' ORDER BY __time DESC LIMIT 100000`, constants.DruidDatasource, query.StartTime, query.EndTime)

	// zap.S().Debug(sqlQuery)

	response, err := client.Query(sqlQuery, "object")

	if err != nil {
		zap.S().Error(query, err)
		return nil, fmt.Errorf("Something went wrong in druid query")
	}

	// responseStr := string(response)
	// zap.S().Info(responseStr)

	res := new([]ServiceMapDependencyItem)
	err = json.Unmarshal(response, res)
	if err != nil {
		zap.S().Error(err)
		return nil, fmt.Errorf("Error in unmarshalling response from druid")
	}
	// resCount := len(*res)
	// fmt.Println(resCount)

	serviceMap := make(map[string]*ServiceMapDependencyResponseItem)

	spanId2ServiceNameMap := make(map[string]string)
	for i, _ := range *res {
		spanId2ServiceNameMap[(*res)[i].SpanId] = (*res)[i].ServiceName
	}
	for i, _ := range *res {
		parent2childServiceName := spanId2ServiceNameMap[(*res)[i].ParentSpanId] + "-" + spanId2ServiceNameMap[(*res)[i].SpanId]
		if _, ok := serviceMap[parent2childServiceName]; !ok {
			serviceMap[parent2childServiceName] = &ServiceMapDependencyResponseItem{
				Parent:    spanId2ServiceNameMap[(*res)[i].ParentSpanId],
				Child:     spanId2ServiceNameMap[(*res)[i].SpanId],
				CallCount: 1,
			}
		} else {
			serviceMap[parent2childServiceName].CallCount++
		}
	}

	retMe := make([]ServiceMapDependencyResponseItem, 0, len(serviceMap))
	for _, dependency := range serviceMap {
		if dependency.Parent == dependency.Child || dependency.Parent == "" {
			continue
		}
		retMe = append(retMe, *dependency)
	}

	return &retMe, nil
}
