// Clickhouse reader methods for powering QB filter suggestions
package clickhouseReader

import (
	"context"
	"database/sql"
	"fmt"
	"slices"
	"strings"

	"github.com/SigNoz/signoz-otel-collector/utils/fingerprint"
	"go.signoz.io/signoz/pkg/query-service/model"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
	"go.uber.org/zap"
)

func (r *ClickHouseReader) GetQBFilterSuggestionsForLogs(
	ctx context.Context,
	req *v3.QBFilterSuggestionsRequest,
) (*v3.QBFilterSuggestionsResponse, *model.ApiError) {
	suggestions := v3.QBFilterSuggestionsResponse{
		AttributeKeys:  []v3.AttributeKey{},
		ExampleQueries: []v3.FilterSet{},
	}

	// Use existing autocomplete logic for generating attribute suggestions
	attribKeysResp, err := r.GetLogAttributeKeys(
		ctx, &v3.FilterAttributeKeyRequest{
			SearchText: req.SearchText,
			DataSource: v3.DataSourceLogs,
			Limit:      int(req.AttributesLimit),
		})
	if err != nil {
		return nil, model.InternalError(fmt.Errorf("couldn't get attribute keys: %w", err))
	}

	suggestions.AttributeKeys = attribKeysResp.AttributeKeys

	// Rank suggested attributes
	attribRanker.sort(suggestions.AttributeKeys)

	// Put together suggested example queries.

	newExampleQuery := func() v3.FilterSet {
		// Include existing filter in example query if specified.
		if req.ExistingFilter != nil {
			return *req.ExistingFilter
		}

		return v3.FilterSet{
			Operator: "AND",
			Items:    []v3.FilterItem{},
		}
	}

	// Suggest example queries for top suggested log attributes and resource attributes
	exampleAttribs := []v3.AttributeKey{}
	for _, attrib := range suggestions.AttributeKeys {
		isAttributeOrResource := slices.Contains([]v3.AttributeKeyType{
			v3.AttributeKeyTypeResource, v3.AttributeKeyTypeTag,
		}, attrib.Type)

		isNumOrStringType := slices.Contains([]v3.AttributeKeyDataType{
			v3.AttributeKeyDataTypeInt64, v3.AttributeKeyDataTypeFloat64, v3.AttributeKeyDataTypeString,
		}, attrib.DataType)

		if isAttributeOrResource && isNumOrStringType {
			exampleAttribs = append(exampleAttribs, attrib)
		}

		if len(exampleAttribs) >= int(req.ExamplesLimit) {
			break
		}
	}

	if len(exampleAttribs) > 0 {
		exampleAttribValues, err := r.getValuesForLogAttributes(
			ctx, exampleAttribs, req.ExamplesLimit,
		)
		if err != nil {
			// Do not fail the entire request if only example query generation fails
			zap.L().Error("could not find attribute values for creating example query", zap.Error(err))
		} else {

			// add example queries for as many attributes as possible.
			// suggest 1st value for 1st attrib, followed by 1st value for second attrib and so on
			// and if there is still room, suggest 2nd value for 1st attrib, 2nd value for 2nd attrib and so on
			for valueIdx := 0; valueIdx < int(req.ExamplesLimit); valueIdx++ {
				for attrIdx, attr := range exampleAttribs {
					needMoreExamples := len(suggestions.ExampleQueries) < int(req.ExamplesLimit)

					if needMoreExamples && valueIdx < len(exampleAttribValues[attrIdx]) {
						exampleQuery := newExampleQuery()
						exampleQuery.Items = append(exampleQuery.Items, v3.FilterItem{
							Key:      attr,
							Operator: "=",
							Value:    exampleAttribValues[attrIdx][valueIdx],
						})

						suggestions.ExampleQueries = append(
							suggestions.ExampleQueries, exampleQuery,
						)
					}
				}
			}
		}
	}

	// Suggest static example queries for standard log attributes if needed.
	if len(suggestions.ExampleQueries) < int(req.ExamplesLimit) {
		exampleQuery := newExampleQuery()
		exampleQuery.Items = append(exampleQuery.Items, v3.FilterItem{
			Key: v3.AttributeKey{
				Key:      "body",
				DataType: v3.AttributeKeyDataTypeString,
				Type:     v3.AttributeKeyTypeUnspecified,
				IsColumn: true,
			},
			Operator: "contains",
			Value:    "error",
		})
		suggestions.ExampleQueries = append(suggestions.ExampleQueries, exampleQuery)
	}

	return &suggestions, nil
}

// Get up to `limit` values seen for each attribute in `attributes`
// Returns a slice of slices where the ith slice has values for ith entry in `attributes`
func (r *ClickHouseReader) getValuesForLogAttributes(
	ctx context.Context, attributes []v3.AttributeKey, limit uint64,
) ([][]any, *model.ApiError) {
	/*
		The query used here needs to be as cheap as possible, and while uncommon, it is possible for
		a tag to have 100s of millions of values (eg: message, request_id)

		Construct a query to UNION the result of querying first `limit` values for each attribute. For example:
		```
			select * from (
				(
					select tag_key, string_value, number_value
					from signoz_logs.distributed_tag_attributes_v2
					where tag_key = $1 and (
						string_value != '' or number_value is not null
					)
					limit 2
				) UNION DISTINCT (
					select tag_key, string_value, number_value
					from signoz_logs.distributed_tag_attributes_v2
					where tag_key = $2 and (
						string_value != '' or number_value is not null
					)
					limit 2
				)
			) settings max_threads=2
		```
		Since tag_attributes table uses ReplacingMergeTree, the values would be distinct and no order by
		is being used to ensure the `limit` clause minimizes the amount of data scanned.
	*/

	if len(attributes) > 10 {
		zap.L().Error(
			"log attribute values requested for too many attributes. This can lead to slow and costly queries",
			zap.Int("count", len(attributes)),
		)
		attributes = attributes[:10]
	}

	tagQueries := []string{}
	tagKeyQueryArgs := []any{}
	for idx, attrib := range attributes {
		tagQueries = append(tagQueries, fmt.Sprintf(`(
			select tag_key, string_value, number_value
			from %s.%s
			where tag_key = $%d and (
				string_value != '' or number_value is not null
			)
			limit %d
		)`, r.logsDB, r.logsTagAttributeTableV2, idx+1, limit))

		tagKeyQueryArgs = append(tagKeyQueryArgs, attrib.Key)
	}

	query := fmt.Sprintf(`select * from (
		%s
	) settings max_threads=2`, strings.Join(tagQueries, " UNION DISTINCT "))

	rows, err := r.db.Query(ctx, query, tagKeyQueryArgs...)
	if err != nil {
		zap.L().Error("couldn't query attrib values for suggestions", zap.Error(err))
		return nil, model.InternalError(fmt.Errorf(
			"couldn't query attrib values for suggestions: %w", err,
		))
	}
	defer rows.Close()

	result := make([][]any, len(attributes))

	// Helper for getting hold of the result slice to append to for each scanned row
	resultIdxForAttrib := func(key string, dataType v3.AttributeKeyDataType) int {
		return slices.IndexFunc(attributes, func(attrib v3.AttributeKey) bool {
			return attrib.Key == key && attrib.DataType == dataType
		})
	}

	// Scan rows and append to result
	for rows.Next() {
		var tagKey string
		var stringValue string
		var float64Value sql.NullFloat64

		err := rows.Scan(
			&tagKey, &stringValue, &float64Value,
		)
		if err != nil {
			return nil, model.InternalError(fmt.Errorf(
				"couldn't scan attrib value rows: %w", err,
			))
		}

		if len(stringValue) > 0 {
			attrResultIdx := resultIdxForAttrib(tagKey, v3.AttributeKeyDataTypeString)
			if attrResultIdx >= 0 {
				result[attrResultIdx] = append(result[attrResultIdx], stringValue)
			}

		} else if float64Value.Valid {
			attrResultIdx := resultIdxForAttrib(tagKey, v3.AttributeKeyDataTypeFloat64)
			if attrResultIdx >= 0 {
				result[attrResultIdx] = append(result[attrResultIdx], float64Value.Float64)
			}
		}
	}

	if err := rows.Err(); err != nil {
		return nil, model.InternalError(fmt.Errorf(
			"couldn't scan attrib value rows: %w", err,
		))
	}

	return result, nil
}

var attribRanker = newRankingStrategy()

func newRankingStrategy() attribRankingStrategy {
	// Some special resource attributes should get ranked above all others.
	interestingResourceAttrsInDescRank := []string{
		"service", "service.name", "env", "k8s.namespace.name",
	}

	// Synonyms of interesting attributes should come next
	resourceHierarchy := fingerprint.ResourceHierarchy()
	for _, attr := range []string{
		"service.name",
		"deployment.environment",
		"k8s.namespace.name",
		"k8s.pod.name",
		"k8s.container.name",
		"k8s.node.name",
	} {
		interestingResourceAttrsInDescRank = append(
			interestingResourceAttrsInDescRank, resourceHierarchy.Synonyms(attr)...,
		)
	}

	interestingResourceAttrsInAscRank := interestingResourceAttrsInDescRank[:]
	slices.Reverse(interestingResourceAttrsInAscRank)

	return attribRankingStrategy{
		interestingResourceAttrsInAscRank: interestingResourceAttrsInAscRank,
	}
}

type attribRankingStrategy struct {
	interestingResourceAttrsInAscRank []string
}

// The higher the score, the higher the rank
func (s *attribRankingStrategy) score(attrib v3.AttributeKey) int {
	if attrib.Type == v3.AttributeKeyTypeResource {
		// 3 + (-1) if attrib.Key is not an interesting resource attribute
		return 3 + slices.Index(s.interestingResourceAttrsInAscRank, attrib.Key)
	}

	if attrib.Type == v3.AttributeKeyTypeTag {
		return 1
	}

	return 0
}

func (s *attribRankingStrategy) sort(attribKeys []v3.AttributeKey) {
	slices.SortFunc(attribKeys, func(a v3.AttributeKey, b v3.AttributeKey) int {
		// To sort in descending order of score the return value must be negative when a > b
		return s.score(b) - s.score(a)
	})
}
