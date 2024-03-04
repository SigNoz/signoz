// Copyright  The OpenTelemetry Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package clickhousetracesexporter

import (
	"context"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
	"github.com/SigNoz/signoz-otel-collector/usage"
	"github.com/google/uuid"
	"go.opencensus.io/stats"
	"go.opencensus.io/stats/view"
	"go.opencensus.io/tag"
	"go.opentelemetry.io/collector/component"
	"go.uber.org/zap"
)

type Encoding string

const (
	// EncodingJSON is used for spans encoded as JSON.
	EncodingJSON Encoding = "json"
	// EncodingProto is used for spans encoded as Protobuf.
	EncodingProto Encoding = "protobuf"
)

// SpanWriter for writing spans to ClickHouse
type SpanWriter struct {
	logger            *zap.Logger
	db                clickhouse.Conn
	traceDatabase     string
	indexTable        string
	errorTable        string
	spansTable        string
	attributeTable    string
	attributeKeyTable string
	encoding          Encoding
	exporterId        uuid.UUID
}

type WriterOptions struct {
	logger            *zap.Logger
	db                clickhouse.Conn
	traceDatabase     string
	spansTable        string
	indexTable        string
	errorTable        string
	attributeTable    string
	attributeKeyTable string
	encoding          Encoding
	exporterId        uuid.UUID
}

// NewSpanWriter returns a SpanWriter for the database
func NewSpanWriter(options WriterOptions) *SpanWriter {
	if err := view.Register(SpansCountView, SpansCountBytesView); err != nil {
		return nil
	}
	writer := &SpanWriter{
		logger:            options.logger,
		db:                options.db,
		traceDatabase:     options.traceDatabase,
		indexTable:        options.indexTable,
		errorTable:        options.errorTable,
		spansTable:        options.spansTable,
		attributeTable:    options.attributeTable,
		attributeKeyTable: options.attributeKeyTable,
		encoding:          options.encoding,
		exporterId:        options.exporterId,
	}

	return writer
}

func (w *SpanWriter) writeIndexBatch(batchSpans []*Span) error {

	ctx := context.Background()
	var statement driver.Batch
	var err error

	defer func() {
		if statement != nil {
			_ = statement.Abort()
		}
	}()
	statement, err = w.db.PrepareBatch(ctx, fmt.Sprintf("INSERT INTO %s.%s", w.traceDatabase, w.indexTable), driver.WithReleaseConnection())
	if err != nil {
		w.logger.Error("Could not prepare batch for index table: ", zap.Error(err))
		return err
	}

	for _, span := range batchSpans {
		err = statement.Append(
			time.Unix(0, int64(span.StartTimeUnixNano)),
			span.TraceId,
			span.SpanId,
			span.ParentSpanId,
			span.ServiceName,
			span.Name,
			span.Kind,
			span.DurationNano,
			span.StatusCode,
			span.ExternalHttpMethod,
			span.ExternalHttpUrl,
			span.Component,
			span.DBSystem,
			span.DBName,
			span.DBOperation,
			span.PeerService,
			span.Events,
			span.HttpMethod,
			span.HttpUrl,
			span.HttpCode,
			span.HttpRoute,
			span.HttpHost,
			span.MsgSystem,
			span.MsgOperation,
			span.HasError,
			span.TagMap,
			span.GRPCMethod,
			span.GRPCCode,
			span.RPCSystem,
			span.RPCService,
			span.RPCMethod,
			span.ResponseStatusCode,
			span.StringTagMap,
			span.NumberTagMap,
			span.BoolTagMap,
			span.ResourceTagsMap,
		)
		if err != nil {
			w.logger.Error("Could not append span to batch: ", zap.Object("span", span), zap.Error(err))
			return err
		}
	}

	start := time.Now()

	err = statement.Send()

	ctx, _ = tag.New(ctx,
		tag.Upsert(exporterKey, string(component.DataTypeTraces)),
		tag.Upsert(tableKey, w.indexTable),
	)
	stats.Record(ctx, writeLatencyMillis.M(int64(time.Since(start).Milliseconds())))
	return err
}

func (w *SpanWriter) writeTagBatch(batchSpans []*Span) error {

	ctx := context.Background()
	var tagKeyStatement driver.Batch
	var tagStatement driver.Batch
	var err error

	defer func() {
		if tagKeyStatement != nil {
			_ = tagKeyStatement.Abort()
		}
		if tagStatement != nil {
			_ = tagStatement.Abort()
		}
	}()
	tagStatement, err = w.db.PrepareBatch(ctx, fmt.Sprintf("INSERT INTO %s.%s", w.traceDatabase, w.attributeTable), driver.WithReleaseConnection())
	if err != nil {
		w.logger.Error("Could not prepare batch for span attributes table due to error: ", zap.Error(err))
		return err
	}
	tagKeyStatement, err = w.db.PrepareBatch(ctx, fmt.Sprintf("INSERT INTO %s.%s", w.traceDatabase, w.attributeKeyTable), driver.WithReleaseConnection())
	if err != nil {
		w.logger.Error("Could not prepare batch for span attributes key table due to error: ", zap.Error(err))
		return err
	}
	// create map of span attributes of key, tagType, dataType and isColumn to avoid duplicates in batch
	mapOfSpanAttributeKeys := make(map[string]struct{})

	// create map of span attributes of key, tagType, dataType, isColumn and value to avoid duplicates in batch
	mapOfSpanAttributeValues := make(map[string]struct{})

	for _, span := range batchSpans {
		for _, spanAttribute := range span.SpanAttributes {

			// form a map key of span attribute key, tagType, dataType, isColumn and value
			mapOfSpanAttributeValueKey := spanAttribute.Key + spanAttribute.TagType + spanAttribute.DataType + strconv.FormatBool(spanAttribute.IsColumn) + spanAttribute.StringValue + strconv.FormatFloat(spanAttribute.NumberValue, 'f', -1, 64)

			// check if mapOfSpanAttributeValueKey already exists in map
			_, ok := mapOfSpanAttributeValues[mapOfSpanAttributeValueKey]
			if ok {
				continue
			}
			// add mapOfSpanAttributeValueKey to map
			mapOfSpanAttributeValues[mapOfSpanAttributeValueKey] = struct{}{}

			// form a map key of span attribute key, tagType, dataType and isColumn
			mapOfSpanAttributeKey := spanAttribute.Key + spanAttribute.TagType + spanAttribute.DataType + strconv.FormatBool(spanAttribute.IsColumn)

			// check if mapOfSpanAttributeKey already exists in map
			_, ok = mapOfSpanAttributeKeys[mapOfSpanAttributeKey]
			if !ok {
				err = tagKeyStatement.Append(
					spanAttribute.Key,
					spanAttribute.TagType,
					spanAttribute.DataType,
					spanAttribute.IsColumn,
				)
				if err != nil {
					w.logger.Error("Could not append span to tagKey Statement to batch due to error: ", zap.Error(err), zap.Object("span", span))
					return err
				}
			}
			// add mapOfSpanAttributeKey to map
			mapOfSpanAttributeKeys[mapOfSpanAttributeKey] = struct{}{}

			if spanAttribute.DataType == "string" {
				err = tagStatement.Append(
					time.Unix(0, int64(span.StartTimeUnixNano)),
					spanAttribute.Key,
					spanAttribute.TagType,
					spanAttribute.DataType,
					spanAttribute.StringValue,
					nil,
					spanAttribute.IsColumn,
				)
			} else if spanAttribute.DataType == "float64" {
				err = tagStatement.Append(
					time.Unix(0, int64(span.StartTimeUnixNano)),
					spanAttribute.Key,
					spanAttribute.TagType,
					spanAttribute.DataType,
					nil,
					spanAttribute.NumberValue,
					spanAttribute.IsColumn,
				)
			} else if spanAttribute.DataType == "bool" {
				err = tagStatement.Append(
					time.Unix(0, int64(span.StartTimeUnixNano)),
					spanAttribute.Key,
					spanAttribute.TagType,
					spanAttribute.DataType,
					nil,
					nil,
					spanAttribute.IsColumn,
				)
			}
			if err != nil {
				w.logger.Error("Could not append span to tag Statement batch due to error: ", zap.Error(err), zap.Object("span", span))
				return err
			}
		}
	}

	tagStart := time.Now()
	err = tagStatement.Send()
	stats.RecordWithTags(ctx,
		[]tag.Mutator{
			tag.Upsert(exporterKey, string(component.DataTypeTraces)),
			tag.Upsert(tableKey, w.attributeTable),
		},
		writeLatencyMillis.M(int64(time.Since(tagStart).Milliseconds())),
	)
	if err != nil {
		w.logger.Error("Could not write to span attributes table due to error: ", zap.Error(err))
		return err
	}

	tagKeyStart := time.Now()
	err = tagKeyStatement.Send()
	stats.RecordWithTags(ctx,
		[]tag.Mutator{
			tag.Upsert(exporterKey, string(component.DataTypeTraces)),
			tag.Upsert(tableKey, w.attributeKeyTable),
		},
		writeLatencyMillis.M(int64(time.Since(tagKeyStart).Milliseconds())),
	)
	if err != nil {
		w.logger.Error("Could not write to span attributes key table due to error: ", zap.Error(err))
		return err
	}

	return err
}

func (w *SpanWriter) writeErrorBatch(batchSpans []*Span) error {

	ctx := context.Background()
	var statement driver.Batch
	var err error

	defer func() {
		if statement != nil {
			_ = statement.Abort()
		}
	}()
	statement, err = w.db.PrepareBatch(ctx, fmt.Sprintf("INSERT INTO %s.%s", w.traceDatabase, w.errorTable), driver.WithReleaseConnection())
	if err != nil {
		w.logger.Error("Could not prepare batch for error table: ", zap.Error(err))
		return err
	}

	for _, span := range batchSpans {
		if span.ErrorEvent.Name == "" {
			continue
		}
		err = statement.Append(
			time.Unix(0, int64(span.ErrorEvent.TimeUnixNano)),
			span.ErrorID,
			span.ErrorGroupID,
			span.TraceId,
			span.SpanId,
			span.ServiceName,
			span.ErrorEvent.AttributeMap["exception.type"],
			span.ErrorEvent.AttributeMap["exception.message"],
			span.ErrorEvent.AttributeMap["exception.stacktrace"],
			stringToBool(span.ErrorEvent.AttributeMap["exception.escaped"]),
			span.ResourceTagsMap,
			span.IssueStatus,
		)
		if err != nil {
			w.logger.Error("Could not append span to batch: ", zap.Object("span", span), zap.Error(err))
			return err
		}
	}

	start := time.Now()

	err = statement.Send()

	ctx, _ = tag.New(ctx,
		tag.Upsert(exporterKey, string(component.DataTypeTraces)),
		tag.Upsert(tableKey, w.errorTable),
	)
	stats.Record(ctx, writeLatencyMillis.M(int64(time.Since(start).Milliseconds())))
	return err
}

func stringToBool(s string) bool {
	if strings.ToLower(s) == "true" {
		return true
	}
	return false
}

func (w *SpanWriter) writeModelBatch(batchSpans []*Span) error {
	ctx := context.Background()
	var statement driver.Batch
	var err error

	defer func() {
		if statement != nil {
			_ = statement.Abort()
		}
	}()

	statement, err = w.db.PrepareBatch(ctx, fmt.Sprintf("INSERT INTO %s.%s", w.traceDatabase, w.spansTable), driver.WithReleaseConnection())
	if err != nil {
		w.logger.Error("Could not prepare batch for model table: ", zap.Error(err))
		return err
	}

	metrics := map[string]usage.Metric{}
	for _, span := range batchSpans {
		var serialized []byte
		usageMap := span.TraceModel
		usageMap.TagMap = map[string]string{}
		serialized, err = json.Marshal(span.TraceModel)
		serializedUsage, err := json.Marshal(usageMap)

		if err != nil {
			return err
		}

		err = statement.Append(time.Unix(0, int64(span.StartTimeUnixNano)), span.TraceId, string(serialized))
		if err != nil {
			w.logger.Error("Could not append span to batch: ", zap.Object("span", span), zap.Error(err))
			return err
		}

		usage.AddMetric(metrics, *span.Tenant, 1, int64(len(serializedUsage)))
	}
	start := time.Now()

	err = statement.Send()
	ctx, _ = tag.New(ctx,
		tag.Upsert(exporterKey, string(component.DataTypeTraces)),
		tag.Upsert(tableKey, w.spansTable),
	)
	stats.Record(ctx, writeLatencyMillis.M(int64(time.Since(start).Milliseconds())))
	if err != nil {
		return err
	}
	for k, v := range metrics {
		stats.RecordWithTags(ctx, []tag.Mutator{tag.Upsert(usage.TagTenantKey, k), tag.Upsert(usage.TagExporterIdKey, w.exporterId.String())}, ExporterSigNozSentSpans.M(int64(v.Count)), ExporterSigNozSentSpansBytes.M(int64(v.Size)))
	}

	return nil
}

// WriteBatchOfSpans writes the encoded batch of spans
func (w *SpanWriter) WriteBatchOfSpans(batch []*Span) error {
	if w.spansTable != "" {
		if err := w.writeModelBatch(batch); err != nil {
			w.logger.Error("Could not write a batch of spans to model table: ", zap.Error(err))
			return err
		}
	}
	if w.indexTable != "" {
		if err := w.writeIndexBatch(batch); err != nil {
			w.logger.Error("Could not write a batch of spans to index table: ", zap.Error(err))
			return err
		}
	}
	if w.errorTable != "" {
		if err := w.writeErrorBatch(batch); err != nil {
			w.logger.Error("Could not write a batch of spans to error table: ", zap.Error(err))
			return err
		}
	}
	if w.attributeTable != "" && w.attributeKeyTable != "" {
		if err := w.writeTagBatch(batch); err != nil {
			w.logger.Error("Could not write a batch of spans to tag/tagKey tables: ", zap.Error(err))
			return err
		}
	}
	return nil
}

// Close closes the writer
func (w *SpanWriter) Close() error {
	if w.db != nil {
		return w.db.Close()
	}
	return nil
}
