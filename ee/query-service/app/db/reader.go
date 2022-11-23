package db

import (
	"context"
	"crypto/md5"
	"encoding/json"
	"errors"
	"fmt"
	"reflect"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/mailru/easyjson"
	"go.uber.org/zap"

	"github.com/jmoiron/sqlx"

	"go.signoz.io/signoz/ee/query-service/constants"
	"go.signoz.io/signoz/ee/query-service/model"
	basechr "go.signoz.io/signoz/pkg/query-service/app/clickhouseReader"
	basemodel "go.signoz.io/signoz/pkg/query-service/model"
	"go.signoz.io/signoz/pkg/query-service/utils"
)

type ClickhouseReader struct {
	conn  clickhouse.Conn
	appdb *sqlx.DB
	*basechr.ClickHouseReader
}

func NewDataConnector(localDB *sqlx.DB, promConfigPath string) *ClickhouseReader {
	ch := basechr.NewReader(localDB, promConfigPath)
	return &ClickhouseReader{
		conn:             ch.GetConn(),
		appdb:            localDB,
		ClickHouseReader: ch,
	}
}

func (r *ClickhouseReader) Start(readerReady chan bool) {
	r.ClickHouseReader.Start(readerReady)
}

// SearchTracesEE returns spans of a trace matching the given query.
func (r *ClickhouseReader) SearchTracesEE(ctx context.Context, traceId string, spanId string, levelUp int, levelDown int) (*[]basemodel.SearchSpansResult, error) {

	var searchScanResponses []basemodel.SearchSpanDBResponseItem
	query := fmt.Sprintf("SELECT timestamp, traceID, model FROM %s.%s WHERE traceID=$1", r.TraceDB, r.SpansTable)
	start := time.Now()

	err := r.conn.Select(ctx, &searchScanResponses, query, traceId)

	zap.S().Info(query)

	if err != nil {
		zap.S().Debug("Error in processing sql query: ", err)
		return nil, fmt.Errorf("Error in processing sql query")
	}
	end := time.Now()
	zap.S().Debug("getTraceSQLQuery took: ", end.Sub(start))
	searchSpansResult := []basemodel.SearchSpansResult{{
		Columns: []string{"__time", "SpanId", "TraceId", "ServiceName", "Name", "Kind", "DurationNano", "TagsKeys", "TagsValues", "References", "Events", "HasError"},
		Events:  make([][]interface{}, len(searchScanResponses)),
	},
	}
	searchSpanResponses := []basemodel.SearchSpanResponseItem{}
	start = time.Now()
	for _, item := range searchScanResponses {
		var jsonItem basemodel.SearchSpanResponseItem
		easyjson.Unmarshal([]byte(item.Model), &jsonItem)
		jsonItem.TimeUnixNano = uint64(item.Timestamp.UnixNano() / 1000000)
		searchSpanResponses = append(searchSpanResponses, jsonItem)
	}
	end = time.Now()
	zap.S().Debug("getTraceSQLQuery unmarshal took: ", end.Sub(start))

	spanLimit, err := strconv.Atoi(constants.SpanLimitStr)
	if err != nil {
		zap.S().Error("Error during strconv.Atoi() on SPAN_LIMIT env variable: ", err)
		return nil, err
	}
	if len(searchScanResponses) > spanLimit && spanId != "" {
		start = time.Now()
		searchSpansResult, err = smartTraceAlgorithm(searchSpanResponses, spanId, levelUp, levelDown, spanLimit)
		if err != nil {
			return nil, err
		}
		end = time.Now()
		zap.S().Debug("smartTraceAlgo took: ", end.Sub(start))
	} else {
		for i, item := range searchSpanResponses {
			spanEvents := item.GetValues()
			searchSpansResult[0].Events[i] = spanEvents
		}
	}

	return &searchSpansResult, nil

}

// smartTraceAlgorithm is an algorithm to find the target span and build a tree of spans around it with the given levelUp and levelDown parameters and the given spanLimit
func smartTraceAlgorithm(payload []basemodel.SearchSpanResponseItem, targetSpanId string, levelUp int, levelDown int, spanLimit int) ([]basemodel.SearchSpansResult, error) {
	var spans []*model.SpanForTraceDetails

	// Build a slice of spans from the payload
	for _, spanItem := range payload {
		var parentID string
		if len(spanItem.References) > 0 && spanItem.References[0].RefType == "CHILD_OF" {
			parentID = spanItem.References[0].SpanId
		}
		span := &model.SpanForTraceDetails{
			TimeUnixNano: spanItem.TimeUnixNano,
			SpanID:       spanItem.SpanID,
			TraceID:      spanItem.TraceID,
			ServiceName:  spanItem.ServiceName,
			Name:         spanItem.Name,
			Kind:         spanItem.Kind,
			DurationNano: spanItem.DurationNano,
			TagMap:       spanItem.TagMap,
			ParentID:     parentID,
			Events:       spanItem.Events,
			HasError:     spanItem.HasError,
		}
		spans = append(spans, span)
	}

	// Build span trees from the spans
	roots, err := buildSpanTrees(&spans)
	if err != nil {
		return nil, err
	}
	targetSpan := &model.SpanForTraceDetails{}

	// Find the target span in the span trees
	for _, root := range roots {
		targetSpan, err = breadthFirstSearch(root, targetSpanId)
		if targetSpan != nil {
			break
		}
		if err != nil {
			zap.S().Error("Error during BreadthFirstSearch(): ", err)
			return nil, err
		}
	}

	// If the target span is not found, return span not found error
	if targetSpan == nil {
		return nil, errors.New("Span not found")
	}

	// Build the final result
	parents := []*model.SpanForTraceDetails{}

	// Get the parent spans of the target span up to the given levelUp parameter and spanLimit
	preParent := targetSpan
	for i := 0; i < levelUp+1; i++ {
		if i == levelUp {
			preParent.ParentID = ""
		}
		if spanLimit-len(preParent.Children) <= 0 {
			parents = append(parents, preParent)
			parents = append(parents, preParent.Children[:spanLimit]...)
			spanLimit -= (len(preParent.Children[:spanLimit]) + 1)
			preParent.ParentID = ""
			break
		}
		parents = append(parents, preParent)
		parents = append(parents, preParent.Children...)
		spanLimit -= (len(preParent.Children) + 1)
		preParent = preParent.ParentSpan
		if preParent == nil {
			break
		}
	}

	// Get the child spans of the target span until the given levelDown and spanLimit
	preParents := []*model.SpanForTraceDetails{targetSpan}
	children := []*model.SpanForTraceDetails{}

	for i := 0; i < levelDown && len(preParents) != 0 && spanLimit > 0; i++ {
		parents := []*model.SpanForTraceDetails{}
		for _, parent := range preParents {
			if spanLimit-len(parent.Children) <= 0 {
				children = append(children, parent.Children[:spanLimit]...)
				spanLimit -= len(parent.Children[:spanLimit])
				break
			}
			children = append(children, parent.Children...)
			parents = append(parents, parent.Children...)
		}
		preParents = parents
	}

	// Store the final list of spans in the resultSpanSet map to avoid duplicates
	resultSpansSet := make(map[*model.SpanForTraceDetails]struct{})
	resultSpansSet[targetSpan] = struct{}{}
	for _, parent := range parents {
		resultSpansSet[parent] = struct{}{}
	}
	for _, child := range children {
		resultSpansSet[child] = struct{}{}
	}

	searchSpansResult := []basemodel.SearchSpansResult{{
		Columns: []string{"__time", "SpanId", "TraceId", "ServiceName", "Name", "Kind", "DurationNano", "TagsKeys", "TagsValues", "References", "Events", "HasError"},
		Events:  make([][]interface{}, len(resultSpansSet)),
	},
	}

	// Convert the resultSpansSet map to searchSpansResult
	i := 0 // index for spans
	for item := range resultSpansSet {
		references := []basemodel.OtelSpanRef{
			{
				TraceId: item.TraceID,
				SpanId:  item.ParentID,
				RefType: "CHILD_OF",
			},
		}

		referencesStringArray := []string{}
		for _, item := range references {
			referencesStringArray = append(referencesStringArray, item.ToString())
		}
		keys := make([]string, 0, len(item.TagMap))
		values := make([]string, 0, len(item.TagMap))

		for k, v := range item.TagMap {
			keys = append(keys, k)
			values = append(values, v)
		}
		if item.Events == nil {
			item.Events = []string{}
		}
		searchSpansResult[0].Events[i] = []interface{}{
			item.TimeUnixNano,
			item.SpanID,
			item.TraceID,
			item.ServiceName,
			item.Name,
			strconv.Itoa(int(item.Kind)),
			strconv.FormatInt(item.DurationNano, 10),
			keys,
			values,
			referencesStringArray,
			item.Events,
			item.HasError,
		}
		i++ // increment index
	}
	return searchSpansResult, nil
}

// buildSpanTrees builds trees of spans from a list of spans.
func buildSpanTrees(spansPtr *[]*model.SpanForTraceDetails) ([]*model.SpanForTraceDetails, error) {

	// Build a map of spanID to span for fast lookup
	var roots []*model.SpanForTraceDetails
	spans := *spansPtr
	mapOfSpans := make(map[string]*model.SpanForTraceDetails, len(spans))

	for _, span := range spans {
		if span.ParentID == "" {
			roots = append(roots, span)
		}
		mapOfSpans[span.SpanID] = span
	}

	// Build the span tree by adding children to the parent spans
	for _, span := range spans {
		if span.ParentID == "" {
			continue
		}
		parent := mapOfSpans[span.ParentID]

		// If the parent span is not found, add current span to list of roots
		if parent == nil {
			// zap.S().Debug("Parent Span not found parent_id: ", span.ParentID)
			roots = append(roots, span)
			span.ParentID = ""
			continue
		}

		span.ParentSpan = parent
		parent.Children = append(parent.Children, span)
	}

	return roots, nil
}

// breadthFirstSearch performs a breadth-first search on the span tree to find the target span.
func breadthFirstSearch(spansPtr *model.SpanForTraceDetails, targetId string) (*model.SpanForTraceDetails, error) {
	queue := []*model.SpanForTraceDetails{spansPtr}
	visited := make(map[string]bool)

	for len(queue) > 0 {
		current := queue[0]
		visited[current.SpanID] = true
		queue = queue[1:]
		if current.SpanID == targetId {
			return current, nil
		}

		for _, child := range current.Children {
			if ok, _ := visited[child.SpanID]; !ok {
				queue = append(queue, child)
			}
		}
	}
	return nil, nil
}

// GetMetricResultEE runs the query and returns list of time series
func (r *ClickhouseReader) GetMetricResultEE(ctx context.Context, query string) ([]*basemodel.Series, string, error) {

	defer utils.Elapsed("GetMetricResult")()
	zap.S().Infof("Executing metric result query: %s", query)

	var hash string
	// If getSubTreeSpans function is used in the clickhouse query
	if strings.Index(query, "getSubTreeSpans(") != -1 {
		var err error
		query, err = r.getSubTreeSpansCustomFunction(ctx, query, hash)
		if err == fmt.Errorf("No spans found for the given query") {
			return nil, "", nil
		}
		if err != nil {
			return nil, "", err
		}
	}

	rows, err := r.conn.Query(ctx, query)
	zap.S().Info(query)
	if err != nil {
		zap.S().Debug("Error in processing query: ", err)
		return nil, "", fmt.Errorf("error in processing query")
	}

	var (
		columnTypes = rows.ColumnTypes()
		columnNames = rows.Columns()
		vars        = make([]interface{}, len(columnTypes))
	)
	for i := range columnTypes {
		vars[i] = reflect.New(columnTypes[i].ScanType()).Interface()
	}
	// when group by is applied, each combination of cartesian product
	// of attributes is separate series. each item in metricPointsMap
	// represent a unique series.
	metricPointsMap := make(map[string][]basemodel.MetricPoint)
	// attribute key-value pairs for each group selection
	attributesMap := make(map[string]map[string]string)

	defer rows.Close()
	for rows.Next() {
		if err := rows.Scan(vars...); err != nil {
			return nil, "", err
		}
		var groupBy []string
		var metricPoint basemodel.MetricPoint
		groupAttributes := make(map[string]string)
		// Assuming that the end result row contains a timestamp, value and option labels
		// Label key and value are both strings.
		for idx, v := range vars {
			colName := columnNames[idx]
			switch v := v.(type) {
			case *string:
				// special case for returning all labels
				if colName == "fullLabels" {
					var metric map[string]string
					err := json.Unmarshal([]byte(*v), &metric)
					if err != nil {
						return nil, "", err
					}
					for key, val := range metric {
						groupBy = append(groupBy, val)
						groupAttributes[key] = val
					}
				} else {
					groupBy = append(groupBy, *v)
					groupAttributes[colName] = *v
				}
			case *time.Time:
				metricPoint.Timestamp = v.UnixMilli()
			case *float64:
				metricPoint.Value = *v
			}
		}
		sort.Strings(groupBy)
		key := strings.Join(groupBy, "")
		attributesMap[key] = groupAttributes
		metricPointsMap[key] = append(metricPointsMap[key], metricPoint)
	}

	var seriesList []*basemodel.Series
	for key := range metricPointsMap {
		points := metricPointsMap[key]
		// first point in each series could be invalid since the
		// aggregations are applied with point from prev series
		if len(points) != 0 && len(points) > 1 {
			points = points[1:]
		}
		attributes := attributesMap[key]
		series := basemodel.Series{Labels: attributes, Points: points}
		seriesList = append(seriesList, &series)
	}
	// err = r.conn.Exec(ctx, "DROP TEMPORARY TABLE IF EXISTS getSubTreeSpans"+hash)
	// if err != nil {
	// 	zap.S().Error("Error in dropping temporary table: ", err)
	// 	return nil, err
	// }
	if hash == "" {
		return seriesList, hash, nil
	} else {
		return seriesList, "getSubTreeSpans" + hash, nil
	}
}

func (r *ClickhouseReader) getSubTreeSpansCustomFunction(ctx context.Context, query string, hash string) (string, error) {

	zap.S().Debugf("Executing getSubTreeSpans function")

	// str1 := `select fromUnixTimestamp64Milli(intDiv( toUnixTimestamp64Milli ( timestamp ), 100) * 100) AS interval, toFloat64(count()) as count from (select timestamp, spanId, parentSpanId, durationNano from getSubTreeSpans(select * from signoz_traces.signoz_index_v2 where serviceName='frontend' and name='/driver.DriverService/FindNearest' and  traceID='00000000000000004b0a863cb5ed7681') where name='FindDriverIDs' group by interval order by interval asc;`

	// process the query to fetch subTree query
	var subtreeInput string
	query, subtreeInput, hash = processQuery(query, hash)

	err := r.conn.Exec(ctx, "DROP TABLE IF EXISTS getSubTreeSpans"+hash)
	if err != nil {
		zap.S().Error("Error in dropping temporary table: ", err)
		return query, err
	}

	// Create temporary table to store the getSubTreeSpans() results
	zap.S().Debugf("Creating temporary table getSubTreeSpans%s", hash)
	err = r.conn.Exec(ctx, "CREATE TABLE IF NOT EXISTS "+"getSubTreeSpans"+hash+" (timestamp DateTime64(9) CODEC(DoubleDelta, LZ4), traceID FixedString(32) CODEC(ZSTD(1)), spanID String CODEC(ZSTD(1)), parentSpanID String CODEC(ZSTD(1)), rootSpanID String CODEC(ZSTD(1)), serviceName LowCardinality(String) CODEC(ZSTD(1)), name LowCardinality(String) CODEC(ZSTD(1)), rootName LowCardinality(String) CODEC(ZSTD(1)), durationNano UInt64 CODEC(T64, ZSTD(1)), kind Int8 CODEC(T64, ZSTD(1)), tagMap Map(LowCardinality(String), String) CODEC(ZSTD(1)), events Array(String) CODEC(ZSTD(2))) ENGINE = MergeTree() ORDER BY (timestamp)")
	if err != nil {
		zap.S().Error("Error in creating temporary table: ", err)
		return query, err
	}

	var getSpansSubQueryDBResponses []model.GetSpansSubQueryDBResponse
	getSpansSubQuery := subtreeInput
	// Execute the subTree query
	zap.S().Debugf("Executing subTree query: %s", getSpansSubQuery)
	err = r.conn.Select(ctx, &getSpansSubQueryDBResponses, getSpansSubQuery)

	// zap.S().Info(getSpansSubQuery)

	if err != nil {
		zap.S().Debug("Error in processing sql query: ", err)
		return query, fmt.Errorf("Error in processing sql query")
	}

	var searchScanResponses []basemodel.SearchSpanDBResponseItem

	// TODO : @ankit: I think the algorithm does not need to assume that subtrees are from the same TraceID. We can take this as an improvement later.
	// Fetch all the spans from of same TraceID so that we can build subtree
	modelQuery := fmt.Sprintf("SELECT timestamp, traceID, model FROM %s.%s WHERE traceID=$1", r.TraceDB, r.SpansTable)

	if len(getSpansSubQueryDBResponses) == 0 {
		return query, fmt.Errorf("No spans found for the given query")
	}
	zap.S().Debugf("Executing query to fetch all the spans from the same TraceID: %s", modelQuery)
	err = r.conn.Select(ctx, &searchScanResponses, modelQuery, getSpansSubQueryDBResponses[0].TraceID)

	if err != nil {
		zap.S().Debug("Error in processing sql query: ", err)
		return query, fmt.Errorf("Error in processing sql query")
	}

	// Process model to fetch the spans
	zap.S().Debugf("Processing model to fetch the spans")
	searchSpanResponses := []basemodel.SearchSpanResponseItem{}
	for _, item := range searchScanResponses {
		var jsonItem basemodel.SearchSpanResponseItem
		json.Unmarshal([]byte(item.Model), &jsonItem)
		jsonItem.TimeUnixNano = uint64(item.Timestamp.UnixNano())
		if jsonItem.Events == nil {
			jsonItem.Events = []string{}
		}
		searchSpanResponses = append(searchSpanResponses, jsonItem)
	}
	// Build the subtree and store all the subtree spans in temporary table getSubTreeSpans+hash
	// Use map to store pointer to the spans to avoid duplicates and save memory
	zap.S().Debugf("Building the subtree to store all the subtree spans in temporary table getSubTreeSpans%s", hash)

	treeSearchResponse, err := getSubTreeAlgorithm(searchSpanResponses, getSpansSubQueryDBResponses)
	if err != nil {
		zap.S().Error("Error in getSubTreeAlgorithm function: ", err)
		return query, err
	}
	zap.S().Debugf("Preparing batch to store subtree spans in temporary table getSubTreeSpans%s", hash)
	statement, err := r.conn.PrepareBatch(context.Background(), fmt.Sprintf("INSERT INTO getSubTreeSpans"+hash))
	if err != nil {
		zap.S().Error("Error in preparing batch statement: ", err)
		return query, err
	}
	for _, span := range treeSearchResponse {
		var parentID string
		if len(span.References) > 0 && span.References[0].RefType == "CHILD_OF" {
			parentID = span.References[0].SpanId
		}
		err = statement.Append(
			time.Unix(0, int64(span.TimeUnixNano)),
			span.TraceID,
			span.SpanID,
			parentID,
			span.RootSpanID,
			span.ServiceName,
			span.Name,
			span.RootName,
			uint64(span.DurationNano),
			int8(span.Kind),
			span.TagMap,
			span.Events,
		)
		if err != nil {
			zap.S().Debug("Error in processing sql query: ", err)
			return query, err
		}
	}
	zap.S().Debugf("Inserting the subtree spans in temporary table getSubTreeSpans%s", hash)
	err = statement.Send()
	if err != nil {
		zap.S().Error("Error in sending statement: ", err)
		return query, err
	}
	return query, nil
}

func processQuery(query string, hash string) (string, string, string) {
	re3 := regexp.MustCompile(`getSubTreeSpans`)

	submatchall3 := re3.FindAllStringIndex(query, -1)
	getSubtreeSpansMatchIndex := submatchall3[0][1]

	query2countParenthesis := query[getSubtreeSpansMatchIndex:]

	sqlCompleteIndex := 0
	countParenthesisImbalance := 0
	for i, char := range query2countParenthesis {

		if string(char) == "(" {
			countParenthesisImbalance += 1
		}
		if string(char) == ")" {
			countParenthesisImbalance -= 1
		}
		if countParenthesisImbalance == 0 {
			sqlCompleteIndex = i
			break
		}
	}
	subtreeInput := query2countParenthesis[1:sqlCompleteIndex]

	// hash the subtreeInput
	hmd5 := md5.Sum([]byte(subtreeInput))
	hash = fmt.Sprintf("%x", hmd5)

	// Reformat the query to use the getSubTreeSpans function
	query = query[:getSubtreeSpansMatchIndex] + hash + " " + query2countParenthesis[sqlCompleteIndex+1:]
	return query, subtreeInput, hash
}

// getSubTreeAlgorithm is an algorithm to build the subtrees of the spans and return the list of spans
func getSubTreeAlgorithm(payload []basemodel.SearchSpanResponseItem, getSpansSubQueryDBResponses []model.GetSpansSubQueryDBResponse) (map[string]*basemodel.SearchSpanResponseItem, error) {

	var spans []*model.SpanForTraceDetails
	for _, spanItem := range payload {
		var parentID string
		if len(spanItem.References) > 0 && spanItem.References[0].RefType == "CHILD_OF" {
			parentID = spanItem.References[0].SpanId
		}
		span := &model.SpanForTraceDetails{
			TimeUnixNano: spanItem.TimeUnixNano,
			SpanID:       spanItem.SpanID,
			TraceID:      spanItem.TraceID,
			ServiceName:  spanItem.ServiceName,
			Name:         spanItem.Name,
			Kind:         spanItem.Kind,
			DurationNano: spanItem.DurationNano,
			TagMap:       spanItem.TagMap,
			ParentID:     parentID,
			Events:       spanItem.Events,
			HasError:     spanItem.HasError,
		}
		spans = append(spans, span)
	}

	zap.S().Debug("Building Tree")
	roots, err := buildSpanTrees(&spans)
	if err != nil {
		return nil, err
	}
	searchSpansResult := make(map[string]*basemodel.SearchSpanResponseItem)
	// Every span which was fetched from getSubTree Input SQL query is considered root
	// For each root, get the subtree spans
	for _, getSpansSubQueryDBResponse := range getSpansSubQueryDBResponses {
		targetSpan := &model.SpanForTraceDetails{}
		// zap.S().Debug("Building tree for span id: " + getSpansSubQueryDBResponse.SpanID + " " + strconv.Itoa(i+1) + " of " + strconv.Itoa(len(getSpansSubQueryDBResponses)))
		// Search target span object in the tree
		for _, root := range roots {
			targetSpan, err = breadthFirstSearch(root, getSpansSubQueryDBResponse.SpanID)
			if targetSpan != nil {
				break
			}
			if err != nil {
				zap.S().Error("Error during BreadthFirstSearch(): ", err)
				return nil, err
			}
		}
		if targetSpan == nil {
			return nil, nil
		}
		// Build subtree for the target span
		// Mark the target span as root by setting parent ID as empty string
		targetSpan.ParentID = ""
		preParents := []*model.SpanForTraceDetails{targetSpan}
		children := []*model.SpanForTraceDetails{}

		// Get the subtree child spans
		for i := 0; len(preParents) != 0; i++ {
			parents := []*model.SpanForTraceDetails{}
			for _, parent := range preParents {
				children = append(children, parent.Children...)
				parents = append(parents, parent.Children...)
			}
			preParents = parents
		}

		resultSpans := children
		// Add the target span to the result spans
		resultSpans = append(resultSpans, targetSpan)

		for _, item := range resultSpans {
			references := []basemodel.OtelSpanRef{
				{
					TraceId: item.TraceID,
					SpanId:  item.ParentID,
					RefType: "CHILD_OF",
				},
			}

			if item.Events == nil {
				item.Events = []string{}
			}
			searchSpansResult[item.SpanID] = &basemodel.SearchSpanResponseItem{
				TimeUnixNano: item.TimeUnixNano,
				SpanID:       item.SpanID,
				TraceID:      item.TraceID,
				ServiceName:  item.ServiceName,
				Name:         item.Name,
				Kind:         item.Kind,
				References:   references,
				DurationNano: item.DurationNano,
				TagMap:       item.TagMap,
				Events:       item.Events,
				HasError:     item.HasError,
				RootSpanID:   getSpansSubQueryDBResponse.SpanID,
				RootName:     targetSpan.Name,
			}
		}
	}
	return searchSpansResult, nil
}
