package migrate

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"go.signoz.io/signoz/pkg/query-service/app/dashboards"
)

func migrateIngestionDashboard(conn *sqlx.DB) error {
	exists, err := checkIfIngestionDashboardExists(conn)
	if err != nil {
		return fmt.Errorf("error checking if ingestion dashboard exists: %w", err)
	}
	if !exists {
		return nil
	}
	return createIngestionDashboardV2(conn)
}

func checkIfIngestionDashboardExists(conn *sqlx.DB) (bool, error) {
	query := `SELECT COUNT(*) FROM dashboards WHERE data LIKE '%"title":"Ingestion"%'`

	var count int
	err := conn.Get(&count, query)
	if err != nil {
		return false, fmt.Errorf("error checking if ingestion dashboard exists: %w", err)
	}

	return count > 0, nil
}

func createIngestionDashboardV2(conn *sqlx.DB) error {
	mapData := make(map[string]interface{})
	err := json.Unmarshal([]byte(newIngestionDashboard), &mapData)
	if err != nil {
		return fmt.Errorf("error unmarshalling ingestion dashboard: %w", err)
	}
	dash := &dashboards.Dashboard{
		Data: mapData,
	}
	userEmail := "admin@signoz.cloud"
	dash.CreatedAt = time.Now()
	dash.CreateBy = &userEmail
	dash.UpdatedAt = time.Now()
	dash.UpdateBy = &userEmail
	dash.UpdateSlug()
	dash.Uuid = uuid.New().String()

	dataMarshaled, err := json.Marshal(dash.Data)
	if err != nil {
		return fmt.Errorf("error marshalling ingestion dashboard: %w", err)
	}

	query := "INSERT INTO dashboards (uuid, created_at, created_by, updated_at, updated_by, data) VALUES ($1, $2, $3, $4, $5, $6)"
	_, err = conn.Exec(query, dash.Uuid, dash.CreatedAt, dash.CreateBy, dash.UpdatedAt, dash.UpdateBy, dataMarshaled)
	if err != nil {
		return fmt.Errorf("error inserting ingestion dashboard: %w", err)
	}
	return nil
}

var newIngestionDashboard = `
{
  "description": "This dashboard shows the metrics, traces and logs ingested.  Please follow the following guides to control your data sent to SigNoz. Only last 15 minutes of data is shown as this is mainly intended to help you understand the recent volume. \n\nMetrics: https://signoz.io/docs/userguide/drop-metrics/\n\n\nLogs: https://signoz.io/docs/logs-management/guides/drop-logs/\n\n\nTraces: https://signoz.io/docs/traces-management/guides/drop-spans/",
  "image": "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTgiIGhlaWdodD0iMTgiIHZpZXdCb3g9IjAgMCAxOCAxOCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTE0Ljk0OTQgMTMuOTQyQzE2LjIzMTggMTIuNDI1OCAxNy4zMjY4IDkuNzAyMiAxNi4xOTU2IDYuNTc0ODdDMTUuNjQ0MyA1LjA1MjQ1IDE1LjAyMTkgNC4yMDI0OSAxNC4yOTY5IDMuNjYyNTJDMTMuODU1NyAzLjMzMzc5IDEyLjA5MzMgMi41MDYzMyA5Ljc1OTY1IDIuODY3NTZDOC4wNTM0OSAzLjEzMjU1IDUuNzc0ODcgNC4yMDg3NCA0LjI5MzY5IDUuOTU5OUMyLjg1NzUyIDcuNjYxMDYgMS43NDg4MyA5LjAwNDc0IDEuNjk3NTggMTAuMzA5N0MxLjYzMTMzIDExLjk4ODMgMi44OTYyNyAxMy40MzA4IDMuMDUwMDEgMTMuNjY0NUMzLjMyMzc0IDE0LjA3OTUgNS4xOTExNSAxNi40NTE4IDguNjk5NzEgMTYuNTczMUMxMS43OTcgMTYuNjc5MyAxMy44MTQ0IDE1LjI4NDQgMTQuOTQ5NCAxMy45NDJaIiBmaWxsPSIjNDAzRDNFIi8+CjxwYXRoIGQ9Ik00LjU1MzYzIDIuNzM3NDdDMi45Mzc0NiAzLjg5MTE2IDEuMTIxMzEgNi4yNTEwMyAxLjQ0NzU0IDkuNTYwODZDMS42MDYyOCAxMS4xNzIgMi4wMDI1MSAxMi4xNDk1IDIuNTcxMjMgMTIuODUwN0MyLjkxNzQ2IDEzLjI3ODIgNC40MTk4OCAxNC41NDkzIDYuNzczNTEgMTQuNzM2OEM5LjE0NTg4IDE0LjkyNTYgMTAuOTQ5NSAxNC4zOTQ0IDEyLjgzMzIgMTMuMDg0NEMxNi42NjE3IDEwLjQyMDggMTYuMDk4IDYuMzkzNTMgMTUuOTM0MyA1LjkyNDhDMTUuNzcwNSA1LjQ1NjA3IDE0LjU0NDQgMi42OTYyMiAxMS4xNzMzIDEuNzE1MDJDOC4xOTg0NCAwLjg1MDA2OCA1Ljk4MzU1IDEuNzE1MDIgNC41NTM2MyAyLjczNzQ3WiIgZmlsbD0iIzVFNjM2NyIvPgo8cGF0aCBkPSJNNy4zOTM1MyAyLjk2MTA5QzUuNjE3MzcgMi44OTczNCAzLjkxOTk2IDQuMjg4NTIgMy43NTYyMiA2LjAwNTkzQzMuNTkyNDggNy43MjIwOSA0LjY1NDkyIDkuMDI5NTIgNi4zMDk4MyA5LjI5NTc2QzcuOTY0NzUgOS41NjA3NCA5Ljg3ODM5IDguNTU1OCAxMC4yNjM0IDYuNDUwOTFDMTAuNjYwOSA0LjI4MjI3IDkuMDg5NjkgMy4wMjIzNCA3LjM5MzUzIDIuOTYxMDlaIiBmaWxsPSJ3aGl0ZSIvPgo8cGF0aCBkPSJNNy45NDIxNyA1LjkwMTE1QzcuOTQyMTcgNS45MDExNSA4LjM2OTY1IDUuODEyNCA4LjQ1NDY1IDUuMTgyNDRDOC41MzgzOSA0LjU2MjQ3IDguMjMwOTEgNC4wMzM3NSA3LjUxMzQ1IDMuODQzNzZDNi43MzM0OSAzLjYzNzUyIDYuMjA0NzcgNC4wNjYyNSA2LjA2NzI3IDQuNTE3NDdDNS44NzYwMyA1LjE0NDk0IDYuMTU4NTIgNS40NDM2NyA2LjE1ODUyIDUuNDQzNjdDNi4xNTg1MiA1LjQ0MzY3IDUuMzkzNTYgNS42Mjc0MSA1LjMzMjMxIDYuNTI5ODdDNS4yNzQ4MSA3LjM4MTA3IDUuODU2MDMgNy44Mzg1NSA2LjQzOTc1IDcuOTc4NTRDNy4xNjA5NiA4LjE1MjI4IDcuOTc4NDIgNy45NTQ3OSA4LjE3ODQxIDcuMDM0ODRDOC4zNDQ2NSA2LjI3NzM4IDcuOTQyMTcgNS45MDExNSA3Ljk0MjE3IDUuOTAxMTVaIiBmaWxsPSIjMzAzMDMwIi8+CjxwYXRoIGQ9Ik02LjczOTgzIDQuNzUzNjJDNi42NzEwOSA1LjAxMjM1IDYuODA4NTggNS4yNjIzNCA3LjA3ODU3IDUuMzMxMDlDNy4zNjk4IDUuNDA0ODMgNy42MzQ3OSA1LjMwODU5IDcuNzA2MDMgNS4wMTExQzcuNzY4NTMgNC43NDczNyA3LjY0MzU0IDQuNTE0ODggNy4zMzYwNSA0LjQzOTg4QzcuMDgzNTcgNC4zNzczOSA2LjgxNDgzIDQuNDcxMTMgNi43Mzk4MyA0Ljc1MzYyWiIgZmlsbD0id2hpdGUiLz4KPHBhdGggZD0iTTYuOTU5NzggNi4wMzk3NEM2LjYzMjMgNS45Mzg0OSA2LjE5OTgyIDYuMDY0NzMgNi4xMzEwNyA2LjUwNDcxQzYuMDYyMzMgNi45NDQ2OSA2LjMyNjA2IDcuMTY5NjggNi42NzEwNCA3LjIzMjE3QzcuMDE2MDMgNy4yOTQ2NyA3LjM0MjI2IDcuMTEzNDMgNy40MDYwMSA2Ljc2MDk1QzcuNDY4NSA2LjQwOTcyIDcuMjg2MDEgNi4xMzk3MyA2Ljk1OTc4IDYuMDM5NzRaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4K",
  "layout": [
    {
      "h": 1,
      "i": "5e1f9c33-8955-4dd6-8dc3-0b6601592c67",
      "maxH": 1,
      "minH": 1,
      "minW": 12,
      "moved": false,
      "static": false,
      "w": 12,
      "x": 0,
      "y": 0
    },
    {
      "h": 4,
      "i": "983bdd34-27b7-4aba-b60d-6baf8bfab535",
      "moved": false,
      "static": false,
      "w": 5,
      "x": 0,
      "y": 1
    },
    {
      "h": 9,
      "i": "18095ed2-8bb9-4bc9-bf09-e1f304c08131",
      "moved": false,
      "static": false,
      "w": 7,
      "x": 5,
      "y": 1
    },
    {
      "h": 5,
      "i": "9542f6a0-86c7-46f8-8981-63a892b12b4b",
      "moved": false,
      "static": false,
      "w": 5,
      "x": 0,
      "y": 5
    },
    {
      "h": 6,
      "i": "b72f44eb-bb37-4777-9b7a-e9bd72ff2f48",
      "moved": false,
      "static": false,
      "w": 6,
      "x": 0,
      "y": 10
    },
    {
      "h": 6,
      "i": "a5c66415-030a-4edd-9d08-9df31f8e2ce9",
      "moved": false,
      "static": false,
      "w": 6,
      "x": 6,
      "y": 10
    },
    {
      "h": 1,
      "i": "__dropping-elem__",
      "isDraggable": true,
      "moved": false,
      "static": false,
      "w": 1,
      "x": 8,
      "y": 16
    },
    {
      "h": 1,
      "i": "a3ec6c7d-5136-4aae-85ac-dc0c991100d8",
      "maxH": 1,
      "minH": 1,
      "minW": 12,
      "moved": false,
      "static": false,
      "w": 12,
      "x": 0,
      "y": 17
    },
    {
      "h": 6,
      "i": "56d419bc-9bca-4432-b69e-1f06e8d209f6",
      "moved": false,
      "static": false,
      "w": 6,
      "x": 0,
      "y": 18
    },
    {
      "h": 6,
      "i": "e278d906-51d5-428b-bc4a-bc0d9069085a",
      "moved": false,
      "static": false,
      "w": 6,
      "x": 6,
      "y": 18
    },
    {
      "h": 7,
      "i": "eec15b67-3b58-4f88-9038-a8138424c3b0",
      "moved": false,
      "static": false,
      "w": 6,
      "x": 0,
      "y": 24
    },
    {
      "h": 7,
      "i": "1d06208b-0432-4228-9d54-b52d5d4e3712",
      "moved": false,
      "static": false,
      "w": 6,
      "x": 6,
      "y": 24
    },
    {
      "h": 1,
      "i": "2f688301-e8e6-4c48-b0d0-2e2a784e5ed4",
      "maxH": 1,
      "minH": 1,
      "minW": 12,
      "moved": false,
      "static": false,
      "w": 12,
      "x": 0,
      "y": 31
    },
    {
      "h": 7,
      "i": "87c88869-8ae9-4dc4-9542-ff4b46bc9c70",
      "moved": false,
      "static": false,
      "w": 3,
      "x": 0,
      "y": 32
    },
    {
      "h": 7,
      "i": "8dff8dad-62e0-4fe1-8c7b-551605f11ef8",
      "moved": false,
      "static": false,
      "w": 3,
      "x": 3,
      "y": 32
    },
    {
      "h": 7,
      "i": "6d3824c7-b00f-496b-a308-eb59016eb3ee",
      "moved": false,
      "static": false,
      "w": 6,
      "x": 6,
      "y": 32
    },
    {
      "h": 7,
      "i": "bca0969b-3150-4b00-b1e4-ed2a7a9e3594",
      "moved": false,
      "static": false,
      "w": 6,
      "x": 0,
      "y": 39
    },
    {
      "h": 7,
      "i": "ce0865eb-973d-40ec-bedb-2f7366e043f8",
      "moved": false,
      "static": false,
      "w": 6,
      "x": 6,
      "y": 39
    },
    {
      "h": 11,
      "i": "04b92695-b37f-49c3-806e-d1f3305fb63c",
      "moved": false,
      "static": false,
      "w": 12,
      "x": 0,
      "y": 46
    },
    {
      "h": 9,
      "i": "644b2494-167e-43b4-8e0c-4def97cdcce4",
      "moved": false,
      "static": false,
      "w": 6,
      "x": 0,
      "y": 57
    },
    {
      "h": 9,
      "i": "3dbd578d-8648-4b76-9e9b-c5e1146753f7",
      "moved": false,
      "static": false,
      "w": 6,
      "x": 6,
      "y": 57
    }
  ],
  "panelMap": {
    "2f688301-e8e6-4c48-b0d0-2e2a784e5ed4": {
      "collapsed": false,
      "widgets": [
        {
          "h": 7,
          "i": "87c88869-8ae9-4dc4-9542-ff4b46bc9c70",
          "moved": false,
          "static": false,
          "w": 3,
          "x": 0,
          "y": 394
        },
        {
          "h": 7,
          "i": "8dff8dad-62e0-4fe1-8c7b-551605f11ef8",
          "moved": false,
          "static": false,
          "w": 3,
          "x": 3,
          "y": 394
        },
        {
          "h": 7,
          "i": "6d3824c7-b00f-496b-a308-eb59016eb3ee",
          "moved": false,
          "static": false,
          "w": 6,
          "x": 6,
          "y": 394
        },
        {
          "h": 7,
          "i": "bca0969b-3150-4b00-b1e4-ed2a7a9e3594",
          "moved": false,
          "static": false,
          "w": 6,
          "x": 0,
          "y": 401
        },
        {
          "h": 7,
          "i": "ce0865eb-973d-40ec-bedb-2f7366e043f8",
          "moved": false,
          "static": false,
          "w": 6,
          "x": 6,
          "y": 401
        },
        {
          "h": 9,
          "i": "04b92695-b37f-49c3-806e-d1f3305fb63c",
          "moved": false,
          "static": false,
          "w": 6,
          "x": 0,
          "y": 408
        },
        {
          "h": 9,
          "i": "3dbd578d-8648-4b76-9e9b-c5e1146753f7",
          "moved": false,
          "static": false,
          "w": 6,
          "x": 6,
          "y": 408
        },
        {
          "h": 9,
          "i": "644b2494-167e-43b4-8e0c-4def97cdcce4",
          "moved": false,
          "static": false,
          "w": 6,
          "x": 0,
          "y": 417
        }
      ]
    },
    "5e1f9c33-8955-4dd6-8dc3-0b6601592c67": {
      "collapsed": false,
      "widgets": [
        {
          "h": 4,
          "i": "983bdd34-27b7-4aba-b60d-6baf8bfab535",
          "moved": false,
          "static": false,
          "w": 5,
          "x": 0,
          "y": 1
        },
        {
          "h": 9,
          "i": "18095ed2-8bb9-4bc9-bf09-e1f304c08131",
          "moved": false,
          "static": false,
          "w": 7,
          "x": 5,
          "y": 1
        },
        {
          "h": 5,
          "i": "9542f6a0-86c7-46f8-8981-63a892b12b4b",
          "moved": false,
          "static": false,
          "w": 5,
          "x": 0,
          "y": 5
        },
        {
          "h": 6,
          "i": "b72f44eb-bb37-4777-9b7a-e9bd72ff2f48",
          "moved": false,
          "static": false,
          "w": 6,
          "x": 0,
          "y": 10
        },
        {
          "h": 6,
          "i": "a5c66415-030a-4edd-9d08-9df31f8e2ce9",
          "moved": false,
          "static": false,
          "w": 6,
          "x": 6,
          "y": 10
        },
        {
          "h": 1,
          "i": "__dropping-elem__",
          "isDraggable": true,
          "moved": false,
          "static": false,
          "w": 1,
          "x": 8,
          "y": 16
        }
      ]
    },
    "a3ec6c7d-5136-4aae-85ac-dc0c991100d8": {
      "collapsed": false,
      "widgets": [
        {
          "h": 6,
          "i": "56d419bc-9bca-4432-b69e-1f06e8d209f6",
          "moved": false,
          "static": false,
          "w": 6,
          "x": 0,
          "y": 96
        },
        {
          "h": 6,
          "i": "e278d906-51d5-428b-bc4a-bc0d9069085a",
          "moved": false,
          "static": false,
          "w": 6,
          "x": 6,
          "y": 96
        },
        {
          "h": 7,
          "i": "eec15b67-3b58-4f88-9038-a8138424c3b0",
          "moved": false,
          "static": false,
          "w": 6,
          "x": 0,
          "y": 102
        },
        {
          "h": 7,
          "i": "1d06208b-0432-4228-9d54-b52d5d4e3712",
          "moved": false,
          "static": false,
          "w": 6,
          "x": 6,
          "y": 102
        }
      ]
    }
  },
  "tags": [
    "usage",
    "ingestion"
  ],
  "title": "IngestionV2",
  "uploadedGrafana": false,
  "version": "v4",
  "widgets": [
    {
      "bucketCount": 30,
      "bucketWidth": 0,
      "columnUnits": {},
      "description": "",
      "fillSpans": false,
      "id": "87c88869-8ae9-4dc4-9542-ff4b46bc9c70",
      "isStacked": false,
      "mergeAllActiveQueries": false,
      "nullZeroValues": "zero",
      "opacity": "1",
      "panelTypes": "value",
      "query": {
        "builder": {
          "queryData": [
            {
              "aggregateAttribute": {
                "dataType": "",
                "id": "------false",
                "isColumn": false,
                "isJSON": false,
                "key": "",
                "type": ""
              },
              "aggregateOperator": "count",
              "dataSource": "metrics",
              "disabled": false,
              "expression": "A",
              "filters": {
                "items": [],
                "op": "AND"
              },
              "functions": [],
              "groupBy": [],
              "having": [],
              "legend": "",
              "limit": null,
              "orderBy": [],
              "queryName": "A",
              "reduceTo": "avg",
              "spaceAggregation": "sum",
              "stepInterval": 60,
              "timeAggregation": "rate"
            }
          ],
          "queryFormulas": []
        },
        "clickhouse_sql": [
          {
            "disabled": false,
            "legend": "",
            "name": "A",
            "query": "SELECT\n    count()\nFROM signoz_metrics.distributed_samples_v4\nWHERE (metric_name NOT LIKE 'signoz_%') AND (metric_name NOT LIKE 'chi_%') AND unix_milli >= toUnixTimestamp(now() - INTERVAL 15 MINUTE) * 1000"
          }
        ],
        "id": "724ae115-2ce0-4165-8556-9e8a26384e7f",
        "promql": [
          {
            "disabled": false,
            "legend": "",
            "name": "A",
            "query": ""
          }
        ],
        "queryType": "clickhouse_sql"
      },
      "selectedLogFields": [
        {
          "dataType": "string",
          "name": "body",
          "type": ""
        },
        {
          "dataType": "string",
          "name": "timestamp",
          "type": ""
        }
      ],
      "selectedTracesFields": [
        {
          "dataType": "string",
          "id": "serviceName--string--tag--true",
          "isColumn": true,
          "isJSON": false,
          "key": "serviceName",
          "type": "tag"
        },
        {
          "dataType": "string",
          "id": "name--string--tag--true",
          "isColumn": true,
          "isJSON": false,
          "key": "name",
          "type": "tag"
        },
        {
          "dataType": "float64",
          "id": "durationNano--float64--tag--true",
          "isColumn": true,
          "isJSON": false,
          "key": "durationNano",
          "type": "tag"
        },
        {
          "dataType": "string",
          "id": "httpMethod--string--tag--true",
          "isColumn": true,
          "isJSON": false,
          "key": "httpMethod",
          "type": "tag"
        },
        {
          "dataType": "string",
          "id": "responseStatusCode--string--tag--true",
          "isColumn": true,
          "isJSON": false,
          "key": "responseStatusCode",
          "type": "tag"
        }
      ],
      "softMax": 0,
      "softMin": 0,
      "stackedBarChart": false,
      "thresholds": [],
      "timePreferance": "GLOBAL_TIME",
      "title": "Total samples",
      "yAxisUnit": "short"
    },
    {
      "bucketCount": 30,
      "bucketWidth": 0,
      "columnUnits": {
        "A": "short"
      },
      "description": "This table contain the metric name and it's total samples count. Note: name of the metric is normalized.",
      "fillSpans": false,
      "id": "6d3824c7-b00f-496b-a308-eb59016eb3ee",
      "isStacked": false,
      "mergeAllActiveQueries": false,
      "nullZeroValues": "zero",
      "opacity": "1",
      "panelTypes": "table",
      "query": {
        "builder": {
          "queryData": [
            {
              "aggregateAttribute": {
                "dataType": "",
                "id": "------false",
                "isColumn": false,
                "isJSON": false,
                "key": "",
                "type": ""
              },
              "aggregateOperator": "count",
              "dataSource": "metrics",
              "disabled": false,
              "expression": "A",
              "filters": {
                "items": [],
                "op": "AND"
              },
              "functions": [],
              "groupBy": [],
              "having": [],
              "legend": "",
              "limit": null,
              "orderBy": [],
              "queryName": "A",
              "reduceTo": "avg",
              "spaceAggregation": "sum",
              "stepInterval": 60,
              "timeAggregation": "rate"
            }
          ],
          "queryFormulas": []
        },
        "clickhouse_sql": [
          {
            "disabled": false,
            "legend": "Count",
            "name": "A",
            "query": "SELECT\n    count() as Count,\n    metric_name as \"Normalized Metric Name\"\nFROM signoz_metrics.distributed_samples_v4\nWHERE (metric_name NOT LIKE 'signoz_%') AND (metric_name NOT LIKE 'chi_%') AND unix_milli >= toUnixTimestamp(now() - INTERVAL 15 MINUTE) * 1000\nGROUP BY metric_name\nORDER BY Count DESC\nLIMIT 100"
          }
        ],
        "id": "fa0f605c-bf1d-435b-9b0e-4a660113fd97",
        "promql": [
          {
            "disabled": false,
            "legend": "",
            "name": "A",
            "query": ""
          }
        ],
        "queryType": "clickhouse_sql"
      },
      "selectedLogFields": [
        {
          "dataType": "string",
          "name": "body",
          "type": ""
        },
        {
          "dataType": "string",
          "name": "timestamp",
          "type": ""
        }
      ],
      "selectedTracesFields": [
        {
          "dataType": "string",
          "id": "serviceName--string--tag--true",
          "isColumn": true,
          "isJSON": false,
          "key": "serviceName",
          "type": "tag"
        },
        {
          "dataType": "string",
          "id": "name--string--tag--true",
          "isColumn": true,
          "isJSON": false,
          "key": "name",
          "type": "tag"
        },
        {
          "dataType": "float64",
          "id": "durationNano--float64--tag--true",
          "isColumn": true,
          "isJSON": false,
          "key": "durationNano",
          "type": "tag"
        },
        {
          "dataType": "string",
          "id": "httpMethod--string--tag--true",
          "isColumn": true,
          "isJSON": false,
          "key": "httpMethod",
          "type": "tag"
        },
        {
          "dataType": "string",
          "id": "responseStatusCode--string--tag--true",
          "isColumn": true,
          "isJSON": false,
          "key": "responseStatusCode",
          "type": "tag"
        }
      ],
      "softMax": 0,
      "softMin": 0,
      "stackedBarChart": false,
      "thresholds": [],
      "timePreferance": "GLOBAL_TIME",
      "title": "Volume breakdown by metric name",
      "yAxisUnit": "none"
    },
    {
      "bucketCount": 30,
      "bucketWidth": 0,
      "columnUnits": {
        "A": "short"
      },
      "description": "",
      "fillSpans": false,
      "id": "ce0865eb-973d-40ec-bedb-2f7366e043f8",
      "isStacked": false,
      "mergeAllActiveQueries": false,
      "nullZeroValues": "zero",
      "opacity": "1",
      "panelTypes": "table",
      "query": {
        "builder": {
          "queryData": [
            {
              "aggregateAttribute": {
                "dataType": "",
                "id": "------false",
                "isColumn": false,
                "isJSON": false,
                "key": "",
                "type": ""
              },
              "aggregateOperator": "count",
              "dataSource": "metrics",
              "disabled": false,
              "expression": "A",
              "filters": {
                "items": [],
                "op": "AND"
              },
              "functions": [],
              "groupBy": [],
              "having": [],
              "legend": "",
              "limit": null,
              "orderBy": [],
              "queryName": "A",
              "reduceTo": "avg",
              "spaceAggregation": "sum",
              "stepInterval": 60,
              "timeAggregation": "rate"
            }
          ],
          "queryFormulas": []
        },
        "clickhouse_sql": [
          {
            "disabled": false,
            "legend": "Count",
            "name": "A",
            "query": "SELECT\n    metric_name as \"Normalized Metric Name\",\n    deployment_environment as \"Deployment Environment\",\n    count() AS \"Count\"\nFROM signoz_metrics.distributed_samples_v4\nINNER JOIN\n(\n    SELECT DISTINCT fingerprint, JSONExtractString(labels, 'deployment_environment') AS deployment_environment\n    FROM signoz_metrics.time_series_v4_1day\n    WHERE (metric_name NOT LIKE 'signoz_%') AND (metric_name NOT LIKE 'chi_%') AND (unix_milli >= intDiv({{.start_timestamp_ms}}, 86400000) * 86400000) AND (unix_milli < {{.end_timestamp_ms}})\n) AS filtered_time_series USING (fingerprint)\nWHERE unix_milli >= toUnixTimestamp(now() - INTERVAL 15 MINUTE) * 1000\nGROUP BY\n    metric_name,\n    deployment_environment\nORDER BY\n    count() DESC\nLIMIT 100"
          }
        ],
        "id": "883d6774-752d-4b7d-b3df-5308832d7741",
        "promql": [
          {
            "disabled": false,
            "legend": "",
            "name": "A",
            "query": ""
          }
        ],
        "queryType": "clickhouse_sql"
      },
      "selectedLogFields": [
        {
          "dataType": "string",
          "name": "body",
          "type": ""
        },
        {
          "dataType": "string",
          "name": "timestamp",
          "type": ""
        }
      ],
      "selectedTracesFields": [
        {
          "dataType": "string",
          "id": "serviceName--string--tag--true",
          "isColumn": true,
          "isJSON": false,
          "key": "serviceName",
          "type": "tag"
        },
        {
          "dataType": "string",
          "id": "name--string--tag--true",
          "isColumn": true,
          "isJSON": false,
          "key": "name",
          "type": "tag"
        },
        {
          "dataType": "float64",
          "id": "durationNano--float64--tag--true",
          "isColumn": true,
          "isJSON": false,
          "key": "durationNano",
          "type": "tag"
        },
        {
          "dataType": "string",
          "id": "httpMethod--string--tag--true",
          "isColumn": true,
          "isJSON": false,
          "key": "httpMethod",
          "type": "tag"
        },
        {
          "dataType": "string",
          "id": "responseStatusCode--string--tag--true",
          "isColumn": true,
          "isJSON": false,
          "key": "responseStatusCode",
          "type": "tag"
        }
      ],
      "softMax": 0,
      "softMin": 0,
      "stackedBarChart": false,
      "thresholds": [],
      "timePreferance": "GLOBAL_TIME",
      "title": "Volume breakdown by deployment environment and metric name",
      "yAxisUnit": "none"
    },
    {
      "bucketCount": 30,
      "bucketWidth": 0,
      "columnUnits": {
        "A": "short"
      },
      "description": "",
      "fillSpans": false,
      "id": "8dff8dad-62e0-4fe1-8c7b-551605f11ef8",
      "isStacked": false,
      "mergeAllActiveQueries": false,
      "nullZeroValues": "zero",
      "opacity": "1",
      "panelTypes": "table",
      "query": {
        "builder": {
          "queryData": [
            {
              "aggregateAttribute": {
                "dataType": "",
                "id": "------false",
                "isColumn": false,
                "isJSON": false,
                "key": "",
                "type": ""
              },
              "aggregateOperator": "count",
              "dataSource": "metrics",
              "disabled": false,
              "expression": "A",
              "filters": {
                "items": [],
                "op": "AND"
              },
              "functions": [],
              "groupBy": [],
              "having": [],
              "legend": "",
              "limit": null,
              "orderBy": [],
              "queryName": "A",
              "reduceTo": "avg",
              "spaceAggregation": "sum",
              "stepInterval": 60,
              "timeAggregation": "rate"
            }
          ],
          "queryFormulas": []
        },
        "clickhouse_sql": [
          {
            "disabled": false,
            "legend": "Count",
            "name": "A",
            "query": "SELECT\n    deployment_environment as \"Deployment Environment\",\n    count() AS \"Count\"\nFROM signoz_metrics.distributed_samples_v4\nINNER JOIN\n(\n    SELECT DISTINCT fingerprint, JSONExtractString(labels, 'deployment_environment') AS deployment_environment\n    FROM signoz_metrics.time_series_v4_1day\n    WHERE (metric_name NOT LIKE 'signoz_%') AND (metric_name NOT LIKE 'chi_%') AND (unix_milli >= intDiv({{.start_timestamp_ms}}, 86400000) * 86400000) AND (unix_milli < {{.end_timestamp_ms}})\n) AS filtered_time_series USING (fingerprint)\nWHERE unix_milli >= toUnixTimestamp(now() - INTERVAL 15 MINUTE) * 1000\nGROUP BY\n    deployment_environment\nORDER BY\n    count() DESC\nLIMIT 100"
          }
        ],
        "id": "e5c98da0-b22a-47f0-8397-be914800376b",
        "promql": [
          {
            "disabled": false,
            "legend": "",
            "name": "A",
            "query": ""
          }
        ],
        "queryType": "clickhouse_sql"
      },
      "selectedLogFields": [
        {
          "dataType": "string",
          "name": "body",
          "type": ""
        },
        {
          "dataType": "string",
          "name": "timestamp",
          "type": ""
        }
      ],
      "selectedTracesFields": [
        {
          "dataType": "string",
          "id": "serviceName--string--tag--true",
          "isColumn": true,
          "isJSON": false,
          "key": "serviceName",
          "type": "tag"
        },
        {
          "dataType": "string",
          "id": "name--string--tag--true",
          "isColumn": true,
          "isJSON": false,
          "key": "name",
          "type": "tag"
        },
        {
          "dataType": "float64",
          "id": "durationNano--float64--tag--true",
          "isColumn": true,
          "isJSON": false,
          "key": "durationNano",
          "type": "tag"
        },
        {
          "dataType": "string",
          "id": "httpMethod--string--tag--true",
          "isColumn": true,
          "isJSON": false,
          "key": "httpMethod",
          "type": "tag"
        },
        {
          "dataType": "string",
          "id": "responseStatusCode--string--tag--true",
          "isColumn": true,
          "isJSON": false,
          "key": "responseStatusCode",
          "type": "tag"
        }
      ],
      "softMax": 0,
      "softMin": 0,
      "stackedBarChart": false,
      "thresholds": [],
      "timePreferance": "GLOBAL_TIME",
      "title": "Volume breakdown by environment",
      "yAxisUnit": "none"
    },
    {
      "bucketCount": 30,
      "bucketWidth": 0,
      "columnUnits": {
        "A": "short"
      },
      "description": "",
      "fillSpans": false,
      "id": "bca0969b-3150-4b00-b1e4-ed2a7a9e3594",
      "isStacked": false,
      "mergeAllActiveQueries": false,
      "nullZeroValues": "zero",
      "opacity": "1",
      "panelTypes": "table",
      "query": {
        "builder": {
          "queryData": [
            {
              "aggregateAttribute": {
                "dataType": "",
                "id": "------false",
                "isColumn": false,
                "isJSON": false,
                "key": "",
                "type": ""
              },
              "aggregateOperator": "count",
              "dataSource": "metrics",
              "disabled": false,
              "expression": "A",
              "filters": {
                "items": [],
                "op": "AND"
              },
              "functions": [],
              "groupBy": [],
              "having": [],
              "legend": "",
              "limit": null,
              "orderBy": [],
              "queryName": "A",
              "reduceTo": "avg",
              "spaceAggregation": "sum",
              "stepInterval": 60,
              "timeAggregation": "rate"
            }
          ],
          "queryFormulas": []
        },
        "clickhouse_sql": [
          {
            "disabled": false,
            "legend": "Count",
            "name": "A",
            "query": "SELECT\n    metric_name as \"Normalized Metric Name\",\n    service_name as \"Service Name\",\n    count() AS \"Count\"\nFROM signoz_metrics.distributed_samples_v4\nINNER JOIN\n(\n    SELECT DISTINCT fingerprint,\n        JSONExtractString(labels, 'service_name') AS service_name\n    FROM signoz_metrics.time_series_v4_1day\n    WHERE (metric_name NOT LIKE 'signoz_%') AND (metric_name NOT LIKE 'chi_%') AND (unix_milli >= intDiv({{.start_timestamp_ms}}, 86400000) * 86400000) AND (unix_milli < {{.end_timestamp_ms}})\n) AS filtered_time_series USING (fingerprint)\nWHERE unix_milli >= toUnixTimestamp(now() - INTERVAL 15 MINUTE) * 1000\nGROUP BY\n    metric_name,\n    service_name\nORDER BY\n    count() DESC\nLIMIT 100"
          }
        ],
        "id": "943c1751-4a81-407e-b7f0-70bc426294a8",
        "promql": [
          {
            "disabled": false,
            "legend": "",
            "name": "A",
            "query": ""
          }
        ],
        "queryType": "clickhouse_sql"
      },
      "selectedLogFields": [
        {
          "dataType": "string",
          "name": "body",
          "type": ""
        },
        {
          "dataType": "string",
          "name": "timestamp",
          "type": ""
        }
      ],
      "selectedTracesFields": [
        {
          "dataType": "string",
          "id": "serviceName--string--tag--true",
          "isColumn": true,
          "isJSON": false,
          "key": "serviceName",
          "type": "tag"
        },
        {
          "dataType": "string",
          "id": "name--string--tag--true",
          "isColumn": true,
          "isJSON": false,
          "key": "name",
          "type": "tag"
        },
        {
          "dataType": "float64",
          "id": "durationNano--float64--tag--true",
          "isColumn": true,
          "isJSON": false,
          "key": "durationNano",
          "type": "tag"
        },
        {
          "dataType": "string",
          "id": "httpMethod--string--tag--true",
          "isColumn": true,
          "isJSON": false,
          "key": "httpMethod",
          "type": "tag"
        },
        {
          "dataType": "string",
          "id": "responseStatusCode--string--tag--true",
          "isColumn": true,
          "isJSON": false,
          "key": "responseStatusCode",
          "type": "tag"
        }
      ],
      "softMax": 0,
      "softMin": 0,
      "stackedBarChart": false,
      "thresholds": [],
      "timePreferance": "GLOBAL_TIME",
      "title": "Volume by service",
      "yAxisUnit": "none"
    },
    {
      "description": "",
      "id": "2f688301-e8e6-4c48-b0d0-2e2a784e5ed4",
      "panelTypes": "row",
      "title": "Metrics ingestion; Tables show only top 100 by volume"
    },
    {
      "bucketCount": 30,
      "bucketWidth": 0,
      "columnUnits": {},
      "description": "",
      "fillSpans": false,
      "id": "3dbd578d-8648-4b76-9e9b-c5e1146753f7",
      "isStacked": false,
      "mergeAllActiveQueries": false,
      "nullZeroValues": "zero",
      "opacity": "1",
      "panelTypes": "table",
      "query": {
        "builder": {
          "queryData": [
            {
              "aggregateAttribute": {
                "dataType": "",
                "id": "------false",
                "isColumn": false,
                "isJSON": false,
                "key": "",
                "type": ""
              },
              "aggregateOperator": "count",
              "dataSource": "metrics",
              "disabled": false,
              "expression": "A",
              "filters": {
                "items": [],
                "op": "AND"
              },
              "functions": [],
              "groupBy": [],
              "having": [],
              "legend": "",
              "limit": null,
              "orderBy": [],
              "queryName": "A",
              "reduceTo": "avg",
              "spaceAggregation": "sum",
              "stepInterval": 60,
              "timeAggregation": "rate"
            }
          ],
          "queryFormulas": []
        },
        "clickhouse_sql": [
          {
            "disabled": false,
            "legend": "",
            "name": "A",
            "query": "SELECT\n    metric_name as \"Normalized Metric Name\",\n    host_name as \"Host Name\",\n    if(count() > 0, 'Yes', 'No') AS \"Has Data\"\nFROM signoz_metrics.distributed_samples_v4\nINNER JOIN\n(\n    SELECT DISTINCT fingerprint,\n        JSONExtractString(labels, 'host_name') AS host_name\n    FROM signoz_metrics.time_series_v4_1day\n    WHERE (metric_name NOT LIKE 'signoz_%') AND (metric_name NOT LIKE 'chi_%') AND (unix_milli >= intDiv({{.start_timestamp_ms}}, 86400000) * 86400000) AND (unix_milli < {{.end_timestamp_ms}})\n) AS filtered_time_series USING (fingerprint)\nWHERE unix_milli >= toUnixTimestamp(now() - INTERVAL 15 MINUTE) * 1000\nGROUP BY\n    metric_name,\n    host_name\nORDER BY\n    host_name DESC\n"
          }
        ],
        "id": "5d8f9be9-eeff-4f22-8306-366f32a5c061",
        "promql": [
          {
            "disabled": false,
            "legend": "",
            "name": "A",
            "query": ""
          }
        ],
        "queryType": "clickhouse_sql"
      },
      "selectedLogFields": [
        {
          "dataType": "string",
          "name": "body",
          "type": ""
        },
        {
          "dataType": "string",
          "name": "timestamp",
          "type": ""
        }
      ],
      "selectedTracesFields": [
        {
          "dataType": "string",
          "id": "serviceName--string--tag--true",
          "isColumn": true,
          "isJSON": false,
          "key": "serviceName",
          "type": "tag"
        },
        {
          "dataType": "string",
          "id": "name--string--tag--true",
          "isColumn": true,
          "isJSON": false,
          "key": "name",
          "type": "tag"
        },
        {
          "dataType": "float64",
          "id": "durationNano--float64--tag--true",
          "isColumn": true,
          "isJSON": false,
          "key": "durationNano",
          "type": "tag"
        },
        {
          "dataType": "string",
          "id": "httpMethod--string--tag--true",
          "isColumn": true,
          "isJSON": false,
          "key": "httpMethod",
          "type": "tag"
        },
        {
          "dataType": "string",
          "id": "responseStatusCode--string--tag--true",
          "isColumn": true,
          "isJSON": false,
          "key": "responseStatusCode",
          "type": "tag"
        }
      ],
      "softMax": 0,
      "softMin": 0,
      "stackedBarChart": false,
      "thresholds": [],
      "timePreferance": "GLOBAL_TIME",
      "title": "Is my host sending metric?",
      "yAxisUnit": "none"
    },
    {
      "bucketCount": 30,
      "bucketWidth": 0,
      "columnUnits": {},
      "description": "",
      "fillSpans": false,
      "id": "644b2494-167e-43b4-8e0c-4def97cdcce4",
      "isStacked": false,
      "mergeAllActiveQueries": false,
      "nullZeroValues": "zero",
      "opacity": "1",
      "panelTypes": "table",
      "query": {
        "builder": {
          "queryData": [
            {
              "aggregateAttribute": {
                "dataType": "",
                "id": "------false",
                "isColumn": false,
                "isJSON": false,
                "key": "",
                "type": ""
              },
              "aggregateOperator": "count",
              "dataSource": "metrics",
              "disabled": false,
              "expression": "A",
              "filters": {
                "items": [],
                "op": "AND"
              },
              "functions": [],
              "groupBy": [],
              "having": [],
              "legend": "",
              "limit": null,
              "orderBy": [],
              "queryName": "A",
              "reduceTo": "avg",
              "spaceAggregation": "sum",
              "stepInterval": 60,
              "timeAggregation": "rate"
            }
          ],
          "queryFormulas": []
        },
        "clickhouse_sql": [
          {
            "disabled": false,
            "legend": "",
            "name": "A",
            "query": "SELECT\n    metric_name as \"Normalized Metric Name\",\n    k8s_cluster_name as \"K8s Cluster Name\",\n    k8s_node_name as \"K8s Node Name\",\n    k8s_namespace_name as \"K8s Namespace Name\",\n    if(count() > 0, 'Yes', 'No') AS \"Has Data\"\nFROM signoz_metrics.distributed_samples_v4\nINNER JOIN\n(\n    SELECT DISTINCT fingerprint,\n        JSONExtractString(labels, 'k8s_cluster_name') AS k8s_cluster_name,\n        JSONExtractString(labels, 'k8s_node_name') AS k8s_node_name,\n        JSONExtractString(labels, 'k8s_namespace_name') AS k8s_namespace_name\n    FROM signoz_metrics.time_series_v4_1day\n    WHERE (metric_name NOT LIKE 'signoz_%') AND (metric_name NOT LIKE 'chi_%') AND (unix_milli >= intDiv({{.start_timestamp_ms}}, 86400000) * 86400000) AND (unix_milli < {{.end_timestamp_ms}})\n) AS filtered_time_series USING (fingerprint)\nWHERE unix_milli >= toUnixTimestamp(now() - INTERVAL 15 MINUTE) * 1000\nGROUP BY\n    metric_name,\n    k8s_cluster_name,\n    k8s_node_name,\n    k8s_namespace_name\nORDER BY\n    metric_name DESC,\n    k8s_cluster_name DESC,\n    k8s_node_name DESC,\n    k8s_namespace_name DESC"
          }
        ],
        "id": "7df1077e-439a-4d1f-97a8-9cd514bef8c2",
        "promql": [
          {
            "disabled": false,
            "legend": "",
            "name": "A",
            "query": ""
          }
        ],
        "queryType": "clickhouse_sql"
      },
      "selectedLogFields": [
        {
          "dataType": "string",
          "name": "body",
          "type": ""
        },
        {
          "dataType": "string",
          "name": "timestamp",
          "type": ""
        }
      ],
      "selectedTracesFields": [
        {
          "dataType": "string",
          "id": "serviceName--string--tag--true",
          "isColumn": true,
          "isJSON": false,
          "key": "serviceName",
          "type": "tag"
        },
        {
          "dataType": "string",
          "id": "name--string--tag--true",
          "isColumn": true,
          "isJSON": false,
          "key": "name",
          "type": "tag"
        },
        {
          "dataType": "float64",
          "id": "durationNano--float64--tag--true",
          "isColumn": true,
          "isJSON": false,
          "key": "durationNano",
          "type": "tag"
        },
        {
          "dataType": "string",
          "id": "httpMethod--string--tag--true",
          "isColumn": true,
          "isJSON": false,
          "key": "httpMethod",
          "type": "tag"
        },
        {
          "dataType": "string",
          "id": "responseStatusCode--string--tag--true",
          "isColumn": true,
          "isJSON": false,
          "key": "responseStatusCode",
          "type": "tag"
        }
      ],
      "softMax": 0,
      "softMin": 0,
      "stackedBarChart": false,
      "thresholds": [],
      "timePreferance": "GLOBAL_TIME",
      "title": "Is my cluser,node,namespace sending metric?",
      "yAxisUnit": "none"
    },
    {
      "bucketCount": 30,
      "bucketWidth": 0,
      "columnUnits": {},
      "description": "",
      "fillSpans": false,
      "id": "04b92695-b37f-49c3-806e-d1f3305fb63c",
      "isStacked": false,
      "mergeAllActiveQueries": false,
      "nullZeroValues": "zero",
      "opacity": "1",
      "panelTypes": "table",
      "query": {
        "builder": {
          "queryData": [
            {
              "aggregateAttribute": {
                "dataType": "",
                "id": "------false",
                "isColumn": false,
                "isJSON": false,
                "key": "",
                "type": ""
              },
              "aggregateOperator": "count",
              "dataSource": "metrics",
              "disabled": false,
              "expression": "A",
              "filters": {
                "items": [],
                "op": "AND"
              },
              "functions": [],
              "groupBy": [],
              "having": [],
              "legend": "",
              "limit": null,
              "orderBy": [],
              "queryName": "A",
              "reduceTo": "avg",
              "spaceAggregation": "sum",
              "stepInterval": 60,
              "timeAggregation": "rate"
            }
          ],
          "queryFormulas": []
        },
        "clickhouse_sql": [
          {
            "disabled": false,
            "legend": "Seconds",
            "name": "A",
            "query": "SELECT\n    env as \"Deployment Environment\",\n    metric_name as \"Noramalized Metric Name\",\n    service_name \"Service Name\",\n    if(ceiling(divide(min(diff), 1000)) > 86400000, -1, ceiling(divide(min(diff), 1000))) AS max_diff_in_secs -- not enough points to calculate the diff\nFROM\n(\n    SELECT\n        env,\n        metric_name,\n        service_name,\n        unix_milli - lagInFrame(unix_milli, 1, 0) OVER rate_window AS diff\n    FROM signoz_metrics.distributed_samples_v4\n    INNER JOIN\n    (\n        SELECT DISTINCT\n            env,\n            metric_name,\n            JSONExtractString(labels, 'service_name') AS service_name,\n            anyLast(fingerprint) AS fingerprint\n        FROM signoz_metrics.time_series_v4_1day\n        WHERE metric_name NOT LIKE 'signoz_%' AND (unix_milli >= intDiv({{.start_timestamp_ms}}, 86400000) * 86400000) AND (unix_milli < {{.end_timestamp_ms}})\n        GROUP BY env, metric_name, service_name\n    ) AS filtered_time_series USING (fingerprint)\n    WHERE unix_milli >= (toUnixTimestamp(now() - toIntervalMinute(30)) * 1000)\n    WINDOW rate_window as (PARTITION BY fingerprint ORDER BY fingerprint, unix_milli)\n)\nWHERE diff > 0\nGROUP BY env, metric_name, service_name\nORDER BY env, metric_name, service_name\n"
          }
        ],
        "id": "dcb8402d-0df4-4bc2-b50d-2777718d5326",
        "promql": [
          {
            "disabled": false,
            "legend": "",
            "name": "A",
            "query": ""
          }
        ],
        "queryType": "clickhouse_sql"
      },
      "selectedLogFields": [
        {
          "dataType": "string",
          "name": "body",
          "type": ""
        },
        {
          "dataType": "string",
          "name": "timestamp",
          "type": ""
        }
      ],
      "selectedTracesFields": [
        {
          "dataType": "string",
          "id": "serviceName--string--tag--true",
          "isColumn": true,
          "isJSON": false,
          "key": "serviceName",
          "type": "tag"
        },
        {
          "dataType": "string",
          "id": "name--string--tag--true",
          "isColumn": true,
          "isJSON": false,
          "key": "name",
          "type": "tag"
        },
        {
          "dataType": "float64",
          "id": "durationNano--float64--tag--true",
          "isColumn": true,
          "isJSON": false,
          "key": "durationNano",
          "type": "tag"
        },
        {
          "dataType": "string",
          "id": "httpMethod--string--tag--true",
          "isColumn": true,
          "isJSON": false,
          "key": "httpMethod",
          "type": "tag"
        },
        {
          "dataType": "string",
          "id": "responseStatusCode--string--tag--true",
          "isColumn": true,
          "isJSON": false,
          "key": "responseStatusCode",
          "type": "tag"
        }
      ],
      "softMax": 0,
      "softMin": 0,
      "stackedBarChart": false,
      "thresholds": [],
      "timePreferance": "GLOBAL_TIME",
      "title": "The observed report interval for (metric, service) combination",
      "yAxisUnit": "none"
    },
    {
      "description": "",
      "id": "a3ec6c7d-5136-4aae-85ac-dc0c991100d8",
      "panelTypes": "row",
      "title": "Traces"
    },
    {
      "bucketCount": 30,
      "bucketWidth": 0,
      "columnUnits": {},
      "description": "",
      "fillSpans": false,
      "id": "56d419bc-9bca-4432-b69e-1f06e8d209f6",
      "isStacked": false,
      "mergeAllActiveQueries": false,
      "nullZeroValues": "zero",
      "opacity": "1",
      "panelTypes": "value",
      "query": {
        "builder": {
          "queryData": [
            {
              "aggregateAttribute": {
                "dataType": "",
                "id": "------false",
                "isColumn": false,
                "isJSON": false,
                "key": "",
                "type": ""
              },
              "aggregateOperator": "count",
              "dataSource": "traces",
              "disabled": false,
              "expression": "A",
              "filters": {
                "items": [],
                "op": "AND"
              },
              "functions": [],
              "groupBy": [],
              "having": [],
              "legend": "",
              "limit": null,
              "orderBy": [],
              "queryName": "A",
              "reduceTo": "avg",
              "spaceAggregation": "sum",
              "stepInterval": 60,
              "timeAggregation": "rate"
            }
          ],
          "queryFormulas": []
        },
        "clickhouse_sql": [
          {
            "disabled": false,
            "legend": "",
            "name": "A",
            "query": ""
          }
        ],
        "id": "2145bdd2-30e0-4e79-93a8-4ce85ffab2bc",
        "promql": [
          {
            "disabled": false,
            "legend": "",
            "name": "A",
            "query": ""
          }
        ],
        "queryType": "builder"
      },
      "selectedLogFields": [
        {
          "dataType": "string",
          "name": "body",
          "type": ""
        },
        {
          "dataType": "string",
          "name": "timestamp",
          "type": ""
        }
      ],
      "selectedTracesFields": [
        {
          "dataType": "string",
          "id": "serviceName--string--tag--true",
          "isColumn": true,
          "isJSON": false,
          "key": "serviceName",
          "type": "tag"
        },
        {
          "dataType": "string",
          "id": "name--string--tag--true",
          "isColumn": true,
          "isJSON": false,
          "key": "name",
          "type": "tag"
        },
        {
          "dataType": "float64",
          "id": "durationNano--float64--tag--true",
          "isColumn": true,
          "isJSON": false,
          "key": "durationNano",
          "type": "tag"
        },
        {
          "dataType": "string",
          "id": "httpMethod--string--tag--true",
          "isColumn": true,
          "isJSON": false,
          "key": "httpMethod",
          "type": "tag"
        },
        {
          "dataType": "string",
          "id": "responseStatusCode--string--tag--true",
          "isColumn": true,
          "isJSON": false,
          "key": "responseStatusCode",
          "type": "tag"
        }
      ],
      "softMax": 0,
      "softMin": 0,
      "stackedBarChart": false,
      "thresholds": [],
      "timePreferance": "LAST_15_MIN",
      "title": "Total spans",
      "yAxisUnit": "short"
    },
    {
      "bucketCount": 30,
      "bucketWidth": 0,
      "columnUnits": {
        "A": "short"
      },
      "description": "",
      "fillSpans": false,
      "id": "e278d906-51d5-428b-bc4a-bc0d9069085a",
      "isStacked": false,
      "mergeAllActiveQueries": false,
      "nullZeroValues": "zero",
      "opacity": "1",
      "panelTypes": "table",
      "query": {
        "builder": {
          "queryData": [
            {
              "aggregateAttribute": {
                "dataType": "",
                "id": "------false",
                "isColumn": false,
                "isJSON": false,
                "key": "",
                "type": ""
              },
              "aggregateOperator": "count",
              "dataSource": "traces",
              "disabled": false,
              "expression": "A",
              "filters": {
                "items": [],
                "op": "AND"
              },
              "functions": [],
              "groupBy": [
                {
                  "dataType": "string",
                  "id": "deployment.environment--string--resource--false",
                  "isColumn": false,
                  "isJSON": false,
                  "key": "deployment.environment",
                  "type": "resource"
                },
                {
                  "dataType": "string",
                  "id": "service.name--string--resource--false",
                  "isColumn": false,
                  "isJSON": false,
                  "key": "service.name",
                  "type": "resource"
                }
              ],
              "having": [],
              "legend": "",
              "limit": 100,
              "orderBy": [],
              "queryName": "A",
              "reduceTo": "avg",
              "spaceAggregation": "sum",
              "stepInterval": 60,
              "timeAggregation": "rate"
            }
          ],
          "queryFormulas": []
        },
        "clickhouse_sql": [
          {
            "disabled": false,
            "legend": "Count",
            "name": "A",
            "query": ""
          }
        ],
        "id": "11061d67-bacf-44a5-b128-f1a7873f8c77",
        "promql": [
          {
            "disabled": false,
            "legend": "",
            "name": "A",
            "query": ""
          }
        ],
        "queryType": "builder"
      },
      "selectedLogFields": [
        {
          "dataType": "string",
          "name": "body",
          "type": ""
        },
        {
          "dataType": "string",
          "name": "timestamp",
          "type": ""
        }
      ],
      "selectedTracesFields": [
        {
          "dataType": "string",
          "id": "serviceName--string--tag--true",
          "isColumn": true,
          "isJSON": false,
          "key": "serviceName",
          "type": "tag"
        },
        {
          "dataType": "string",
          "id": "name--string--tag--true",
          "isColumn": true,
          "isJSON": false,
          "key": "name",
          "type": "tag"
        },
        {
          "dataType": "float64",
          "id": "durationNano--float64--tag--true",
          "isColumn": true,
          "isJSON": false,
          "key": "durationNano",
          "type": "tag"
        },
        {
          "dataType": "string",
          "id": "httpMethod--string--tag--true",
          "isColumn": true,
          "isJSON": false,
          "key": "httpMethod",
          "type": "tag"
        },
        {
          "dataType": "string",
          "id": "responseStatusCode--string--tag--true",
          "isColumn": true,
          "isJSON": false,
          "key": "responseStatusCode",
          "type": "tag"
        }
      ],
      "softMax": 0,
      "softMin": 0,
      "stackedBarChart": false,
      "thresholds": [],
      "timePreferance": "LAST_15_MIN",
      "title": "Spans count by env, service",
      "yAxisUnit": "none"
    },
    {
      "bucketCount": 30,
      "bucketWidth": 0,
      "columnUnits": {
        "A": "short"
      },
      "description": "",
      "fillSpans": false,
      "id": "eec15b67-3b58-4f88-9038-a8138424c3b0",
      "isStacked": false,
      "mergeAllActiveQueries": false,
      "nullZeroValues": "zero",
      "opacity": "1",
      "panelTypes": "table",
      "query": {
        "builder": {
          "queryData": [
            {
              "aggregateAttribute": {
                "dataType": "",
                "id": "------false",
                "isColumn": false,
                "isJSON": false,
                "key": "",
                "type": ""
              },
              "aggregateOperator": "count",
              "dataSource": "traces",
              "disabled": false,
              "expression": "A",
              "filters": {
                "items": [],
                "op": "AND"
              },
              "functions": [],
              "groupBy": [
                {
                  "dataType": "string",
                  "id": "service.name--string--resource--false",
                  "isColumn": false,
                  "isJSON": false,
                  "key": "service.name",
                  "type": "resource"
                },
                {
                  "dataType": "string",
                  "id": "name--string----true",
                  "isColumn": true,
                  "isJSON": false,
                  "key": "name",
                  "type": ""
                }
              ],
              "having": [],
              "legend": "",
              "limit": 500,
              "orderBy": [],
              "queryName": "A",
              "reduceTo": "avg",
              "spaceAggregation": "sum",
              "stepInterval": 60,
              "timeAggregation": "rate"
            }
          ],
          "queryFormulas": []
        },
        "clickhouse_sql": [
          {
            "disabled": false,
            "legend": "",
            "name": "A",
            "query": ""
          }
        ],
        "id": "1f54535a-2a8a-4777-b44d-b3eedc5a2551",
        "promql": [
          {
            "disabled": false,
            "legend": "",
            "name": "A",
            "query": ""
          }
        ],
        "queryType": "builder"
      },
      "selectedLogFields": [
        {
          "dataType": "string",
          "name": "body",
          "type": ""
        },
        {
          "dataType": "string",
          "name": "timestamp",
          "type": ""
        }
      ],
      "selectedTracesFields": [
        {
          "dataType": "string",
          "id": "serviceName--string--tag--true",
          "isColumn": true,
          "isJSON": false,
          "key": "serviceName",
          "type": "tag"
        },
        {
          "dataType": "string",
          "id": "name--string--tag--true",
          "isColumn": true,
          "isJSON": false,
          "key": "name",
          "type": "tag"
        },
        {
          "dataType": "float64",
          "id": "durationNano--float64--tag--true",
          "isColumn": true,
          "isJSON": false,
          "key": "durationNano",
          "type": "tag"
        },
        {
          "dataType": "string",
          "id": "httpMethod--string--tag--true",
          "isColumn": true,
          "isJSON": false,
          "key": "httpMethod",
          "type": "tag"
        },
        {
          "dataType": "string",
          "id": "responseStatusCode--string--tag--true",
          "isColumn": true,
          "isJSON": false,
          "key": "responseStatusCode",
          "type": "tag"
        }
      ],
      "softMax": 0,
      "softMin": 0,
      "stackedBarChart": false,
      "thresholds": [],
      "timePreferance": "LAST_15_MIN",
      "title": "Count by span name",
      "yAxisUnit": "none"
    },
    {
      "bucketCount": 30,
      "bucketWidth": 0,
      "columnUnits": {},
      "description": "",
      "fillSpans": false,
      "id": "1d06208b-0432-4228-9d54-b52d5d4e3712",
      "isStacked": false,
      "mergeAllActiveQueries": false,
      "nullZeroValues": "zero",
      "opacity": "1",
      "panelTypes": "table",
      "query": {
        "builder": {
          "queryData": [
            {
              "aggregateAttribute": {
                "dataType": "",
                "id": "------false",
                "isColumn": false,
                "isJSON": false,
                "key": "",
                "type": ""
              },
              "aggregateOperator": "count",
              "dataSource": "metrics",
              "disabled": false,
              "expression": "A",
              "filters": {
                "items": [],
                "op": "AND"
              },
              "functions": [],
              "groupBy": [],
              "having": [],
              "legend": "",
              "limit": null,
              "orderBy": [],
              "queryName": "A",
              "reduceTo": "avg",
              "spaceAggregation": "sum",
              "stepInterval": 60,
              "timeAggregation": "rate"
            }
          ],
          "queryFormulas": []
        },
        "clickhouse_sql": [
          {
            "disabled": false,
            "legend": "",
            "name": "A",
            "query": "SELECT tagKey as \"Attribute Name\", if(tagType='tag', 'Span Attribute', 'Span Resource Attribute') as \"Type\"\nFROM signoz_traces.distributed_span_attributes_keys WHERE isColumn = false\nGROUP BY tagKey, tagType"
          }
        ],
        "id": "15f1b33e-bc69-4ab6-b5ae-8570423a3038",
        "promql": [
          {
            "disabled": false,
            "legend": "",
            "name": "A",
            "query": ""
          }
        ],
        "queryType": "clickhouse_sql"
      },
      "selectedLogFields": [
        {
          "dataType": "string",
          "name": "body",
          "type": ""
        },
        {
          "dataType": "string",
          "name": "timestamp",
          "type": ""
        }
      ],
      "selectedTracesFields": [
        {
          "dataType": "string",
          "id": "serviceName--string--tag--true",
          "isColumn": true,
          "isJSON": false,
          "key": "serviceName",
          "type": "tag"
        },
        {
          "dataType": "string",
          "id": "name--string--tag--true",
          "isColumn": true,
          "isJSON": false,
          "key": "name",
          "type": "tag"
        },
        {
          "dataType": "float64",
          "id": "durationNano--float64--tag--true",
          "isColumn": true,
          "isJSON": false,
          "key": "durationNano",
          "type": "tag"
        },
        {
          "dataType": "string",
          "id": "httpMethod--string--tag--true",
          "isColumn": true,
          "isJSON": false,
          "key": "httpMethod",
          "type": "tag"
        },
        {
          "dataType": "string",
          "id": "responseStatusCode--string--tag--true",
          "isColumn": true,
          "isJSON": false,
          "key": "responseStatusCode",
          "type": "tag"
        }
      ],
      "softMax": 0,
      "softMin": 0,
      "stackedBarChart": false,
      "thresholds": [],
      "timePreferance": "GLOBAL_TIME",
      "title": "List of attributes",
      "yAxisUnit": "none"
    },
    {
      "description": "",
      "id": "5e1f9c33-8955-4dd6-8dc3-0b6601592c67",
      "panelTypes": "row",
      "title": "Logs"
    },
    {
      "bucketCount": 30,
      "bucketWidth": 0,
      "columnUnits": {},
      "description": "",
      "fillSpans": false,
      "id": "983bdd34-27b7-4aba-b60d-6baf8bfab535",
      "isStacked": false,
      "mergeAllActiveQueries": false,
      "nullZeroValues": "zero",
      "opacity": "1",
      "panelTypes": "value",
      "query": {
        "builder": {
          "queryData": [
            {
              "aggregateAttribute": {
                "dataType": "",
                "id": "------false",
                "isColumn": false,
                "isJSON": false,
                "key": "",
                "type": ""
              },
              "aggregateOperator": "count",
              "dataSource": "logs",
              "disabled": false,
              "expression": "A",
              "filters": {
                "items": [],
                "op": "AND"
              },
              "functions": [],
              "groupBy": [],
              "having": [],
              "legend": "",
              "limit": null,
              "orderBy": [],
              "queryName": "A",
              "reduceTo": "sum",
              "spaceAggregation": "sum",
              "stepInterval": 60,
              "timeAggregation": "rate"
            }
          ],
          "queryFormulas": []
        },
        "clickhouse_sql": [
          {
            "disabled": false,
            "legend": "",
            "name": "A",
            "query": ""
          }
        ],
        "id": "4f9389b8-5231-4893-8ea4-4c3c928628c7",
        "promql": [
          {
            "disabled": false,
            "legend": "",
            "name": "A",
            "query": ""
          }
        ],
        "queryType": "builder"
      },
      "selectedLogFields": [
        {
          "dataType": "string",
          "name": "body",
          "type": ""
        },
        {
          "dataType": "string",
          "name": "timestamp",
          "type": ""
        }
      ],
      "selectedTracesFields": [
        {
          "dataType": "string",
          "id": "serviceName--string--tag--true",
          "isColumn": true,
          "isJSON": false,
          "key": "serviceName",
          "type": "tag"
        },
        {
          "dataType": "string",
          "id": "name--string--tag--true",
          "isColumn": true,
          "isJSON": false,
          "key": "name",
          "type": "tag"
        },
        {
          "dataType": "float64",
          "id": "durationNano--float64--tag--true",
          "isColumn": true,
          "isJSON": false,
          "key": "durationNano",
          "type": "tag"
        },
        {
          "dataType": "string",
          "id": "httpMethod--string--tag--true",
          "isColumn": true,
          "isJSON": false,
          "key": "httpMethod",
          "type": "tag"
        },
        {
          "dataType": "string",
          "id": "responseStatusCode--string--tag--true",
          "isColumn": true,
          "isJSON": false,
          "key": "responseStatusCode",
          "type": "tag"
        }
      ],
      "softMax": 0,
      "softMin": 0,
      "stackedBarChart": false,
      "thresholds": [],
      "timePreferance": "LAST_15_MIN",
      "title": "Total logs",
      "yAxisUnit": "short"
    },
    {
      "bucketCount": 30,
      "bucketWidth": 0,
      "columnUnits": {
        "A": "short"
      },
      "description": "",
      "fillSpans": false,
      "id": "b72f44eb-bb37-4777-9b7a-e9bd72ff2f48",
      "isStacked": false,
      "mergeAllActiveQueries": false,
      "nullZeroValues": "zero",
      "opacity": "1",
      "panelTypes": "table",
      "query": {
        "builder": {
          "queryData": [
            {
              "aggregateAttribute": {
                "dataType": "",
                "id": "------false",
                "isColumn": false,
                "isJSON": false,
                "key": "",
                "type": ""
              },
              "aggregateOperator": "count",
              "dataSource": "logs",
              "disabled": false,
              "expression": "A",
              "filters": {
                "items": [],
                "op": "AND"
              },
              "functions": [],
              "groupBy": [
                {
                  "dataType": "",
                  "id": "deployment.environment------false",
                  "isColumn": false,
                  "key": "deployment.environment",
                  "type": "resource"
                },
                {
                  "dataType": "",
                  "id": "sevice.name------false",
                  "isColumn": false,
                  "key": "sevice.name",
                  "type": "resource"
                }
              ],
              "having": [],
              "legend": "",
              "limit": null,
              "orderBy": [],
              "queryName": "A",
              "reduceTo": "avg",
              "spaceAggregation": "sum",
              "stepInterval": 60,
              "timeAggregation": "rate"
            }
          ],
          "queryFormulas": []
        },
        "clickhouse_sql": [
          {
            "disabled": false,
            "legend": "Count",
            "name": "A",
            "query": ""
          }
        ],
        "id": "a21cfccc-d83f-4d3f-811d-5e05340168ec",
        "promql": [
          {
            "disabled": false,
            "legend": "",
            "name": "A",
            "query": ""
          }
        ],
        "queryType": "builder"
      },
      "selectedLogFields": [
        {
          "dataType": "string",
          "name": "body",
          "type": ""
        },
        {
          "dataType": "string",
          "name": "timestamp",
          "type": ""
        }
      ],
      "selectedTracesFields": [
        {
          "dataType": "string",
          "id": "serviceName--string--tag--true",
          "isColumn": true,
          "isJSON": false,
          "key": "serviceName",
          "type": "tag"
        },
        {
          "dataType": "string",
          "id": "name--string--tag--true",
          "isColumn": true,
          "isJSON": false,
          "key": "name",
          "type": "tag"
        },
        {
          "dataType": "float64",
          "id": "durationNano--float64--tag--true",
          "isColumn": true,
          "isJSON": false,
          "key": "durationNano",
          "type": "tag"
        },
        {
          "dataType": "string",
          "id": "httpMethod--string--tag--true",
          "isColumn": true,
          "isJSON": false,
          "key": "httpMethod",
          "type": "tag"
        },
        {
          "dataType": "string",
          "id": "responseStatusCode--string--tag--true",
          "isColumn": true,
          "isJSON": false,
          "key": "responseStatusCode",
          "type": "tag"
        }
      ],
      "softMax": 0,
      "softMin": 0,
      "stackedBarChart": false,
      "thresholds": [],
      "timePreferance": "GLOBAL_TIME",
      "title": "Logs by deployment.environment, service.name",
      "yAxisUnit": "none"
    },
    {
      "bucketCount": 30,
      "bucketWidth": 0,
      "columnUnits": {},
      "description": "",
      "fillSpans": false,
      "id": "9542f6a0-86c7-46f8-8981-63a892b12b4b",
      "isStacked": false,
      "mergeAllActiveQueries": false,
      "nullZeroValues": "zero",
      "opacity": "1",
      "panelTypes": "table",
      "query": {
        "builder": {
          "queryData": [
            {
              "aggregateAttribute": {
                "dataType": "",
                "id": "------false",
                "isColumn": false,
                "isJSON": false,
                "key": "",
                "type": ""
              },
              "aggregateOperator": "count",
              "dataSource": "logs",
              "disabled": false,
              "expression": "A",
              "filters": {
                "items": [],
                "op": "AND"
              },
              "functions": [],
              "groupBy": [
                {
                  "dataType": "string",
                  "id": "severity_text--string----true",
                  "isColumn": true,
                  "isJSON": false,
                  "key": "severity_text",
                  "type": ""
                }
              ],
              "having": [],
              "legend": "",
              "limit": null,
              "orderBy": [],
              "queryName": "A",
              "reduceTo": "avg",
              "spaceAggregation": "sum",
              "stepInterval": 60,
              "timeAggregation": "rate"
            }
          ],
          "queryFormulas": []
        },
        "clickhouse_sql": [
          {
            "disabled": false,
            "legend": "Count",
            "name": "A",
            "query": ""
          }
        ],
        "id": "2eb23fda-d995-47eb-9582-77d66a627cef",
        "promql": [
          {
            "disabled": false,
            "legend": "",
            "name": "A",
            "query": ""
          }
        ],
        "queryType": "builder"
      },
      "selectedLogFields": [
        {
          "dataType": "string",
          "name": "body",
          "type": ""
        },
        {
          "dataType": "string",
          "name": "timestamp",
          "type": ""
        }
      ],
      "selectedTracesFields": [
        {
          "dataType": "string",
          "id": "serviceName--string--tag--true",
          "isColumn": true,
          "isJSON": false,
          "key": "serviceName",
          "type": "tag"
        },
        {
          "dataType": "string",
          "id": "name--string--tag--true",
          "isColumn": true,
          "isJSON": false,
          "key": "name",
          "type": "tag"
        },
        {
          "dataType": "float64",
          "id": "durationNano--float64--tag--true",
          "isColumn": true,
          "isJSON": false,
          "key": "durationNano",
          "type": "tag"
        },
        {
          "dataType": "string",
          "id": "httpMethod--string--tag--true",
          "isColumn": true,
          "isJSON": false,
          "key": "httpMethod",
          "type": "tag"
        },
        {
          "dataType": "string",
          "id": "responseStatusCode--string--tag--true",
          "isColumn": true,
          "isJSON": false,
          "key": "responseStatusCode",
          "type": "tag"
        }
      ],
      "softMax": 0,
      "softMin": 0,
      "stackedBarChart": false,
      "thresholds": [],
      "timePreferance": "LAST_15_MIN",
      "title": "Logs count by level",
      "yAxisUnit": "none"
    },
    {
      "bucketCount": 30,
      "bucketWidth": 0,
      "columnUnits": {
        "A": "short"
      },
      "description": "",
      "fillSpans": false,
      "id": "18095ed2-8bb9-4bc9-bf09-e1f304c08131",
      "isStacked": false,
      "mergeAllActiveQueries": false,
      "nullZeroValues": "zero",
      "opacity": "1",
      "panelTypes": "table",
      "query": {
        "builder": {
          "queryData": [
            {
              "aggregateAttribute": {
                "dataType": "",
                "id": "------false",
                "isColumn": false,
                "isJSON": false,
                "key": "",
                "type": ""
              },
              "aggregateOperator": "count",
              "dataSource": "logs",
              "disabled": false,
              "expression": "A",
              "filters": {
                "items": [],
                "op": "AND"
              },
              "functions": [],
              "groupBy": [
                {
                  "dataType": "string",
                  "id": "log.file.path--string--tag--false",
                  "isColumn": false,
                  "isJSON": false,
                  "key": "log.file.path",
                  "type": "tag"
                }
              ],
              "having": [],
              "legend": "",
              "limit": null,
              "orderBy": [],
              "queryName": "A",
              "reduceTo": "avg",
              "spaceAggregation": "sum",
              "stepInterval": 60,
              "timeAggregation": "rate"
            }
          ],
          "queryFormulas": []
        },
        "clickhouse_sql": [
          {
            "disabled": false,
            "legend": "",
            "name": "A",
            "query": ""
          }
        ],
        "id": "212f628b-3449-4e01-824d-f412a39d99ae",
        "promql": [
          {
            "disabled": false,
            "legend": "",
            "name": "A",
            "query": ""
          }
        ],
        "queryType": "builder"
      },
      "selectedLogFields": [
        {
          "dataType": "string",
          "name": "body",
          "type": ""
        },
        {
          "dataType": "string",
          "name": "timestamp",
          "type": ""
        }
      ],
      "selectedTracesFields": [
        {
          "dataType": "string",
          "id": "serviceName--string--tag--true",
          "isColumn": true,
          "isJSON": false,
          "key": "serviceName",
          "type": "tag"
        },
        {
          "dataType": "string",
          "id": "name--string--tag--true",
          "isColumn": true,
          "isJSON": false,
          "key": "name",
          "type": "tag"
        },
        {
          "dataType": "float64",
          "id": "durationNano--float64--tag--true",
          "isColumn": true,
          "isJSON": false,
          "key": "durationNano",
          "type": "tag"
        },
        {
          "dataType": "string",
          "id": "httpMethod--string--tag--true",
          "isColumn": true,
          "isJSON": false,
          "key": "httpMethod",
          "type": "tag"
        },
        {
          "dataType": "string",
          "id": "responseStatusCode--string--tag--true",
          "isColumn": true,
          "isJSON": false,
          "key": "responseStatusCode",
          "type": "tag"
        }
      ],
      "softMax": 0,
      "softMin": 0,
      "stackedBarChart": false,
      "thresholds": [],
      "timePreferance": "LAST_15_MIN",
      "title": "Logs count by log file path",
      "yAxisUnit": "none"
    },
    {
      "bucketCount": 30,
      "bucketWidth": 0,
      "columnUnits": {},
      "description": "",
      "fillSpans": false,
      "id": "a5c66415-030a-4edd-9d08-9df31f8e2ce9",
      "isStacked": false,
      "mergeAllActiveQueries": false,
      "nullZeroValues": "zero",
      "opacity": "1",
      "panelTypes": "table",
      "query": {
        "builder": {
          "queryData": [
            {
              "aggregateAttribute": {
                "dataType": "",
                "id": "------false",
                "isColumn": false,
                "isJSON": false,
                "key": "",
                "type": ""
              },
              "aggregateOperator": "count",
              "dataSource": "metrics",
              "disabled": false,
              "expression": "A",
              "filters": {
                "items": [],
                "op": "AND"
              },
              "functions": [],
              "groupBy": [],
              "having": [],
              "legend": "",
              "limit": null,
              "orderBy": [],
              "queryName": "A",
              "reduceTo": "avg",
              "spaceAggregation": "sum",
              "stepInterval": 60,
              "timeAggregation": "rate"
            }
          ],
          "queryFormulas": []
        },
        "clickhouse_sql": [
          {
            "disabled": false,
            "legend": "",
            "name": "A",
            "query": "SELECT DISTINCT\n    name,\n    'Log Record Attribute' AS Type\nFROM signoz_logs.distributed_logs_attribute_keys\nUNION ALL\nSELECT DISTINCT\n    name,\n    'Log Resource Attribute' AS Type\nFROM signoz_logs.distributed_logs_resource_keys"
          }
        ],
        "id": "09ad654a-23f9-4bc9-b15c-e0044d2e48c8",
        "promql": [
          {
            "disabled": false,
            "legend": "",
            "name": "A",
            "query": ""
          }
        ],
        "queryType": "clickhouse_sql"
      },
      "selectedLogFields": [
        {
          "dataType": "string",
          "name": "body",
          "type": ""
        },
        {
          "dataType": "string",
          "name": "timestamp",
          "type": ""
        }
      ],
      "selectedTracesFields": [
        {
          "dataType": "string",
          "id": "serviceName--string--tag--true",
          "isColumn": true,
          "isJSON": false,
          "key": "serviceName",
          "type": "tag"
        },
        {
          "dataType": "string",
          "id": "name--string--tag--true",
          "isColumn": true,
          "isJSON": false,
          "key": "name",
          "type": "tag"
        },
        {
          "dataType": "float64",
          "id": "durationNano--float64--tag--true",
          "isColumn": true,
          "isJSON": false,
          "key": "durationNano",
          "type": "tag"
        },
        {
          "dataType": "string",
          "id": "httpMethod--string--tag--true",
          "isColumn": true,
          "isJSON": false,
          "key": "httpMethod",
          "type": "tag"
        },
        {
          "dataType": "string",
          "id": "responseStatusCode--string--tag--true",
          "isColumn": true,
          "isJSON": false,
          "key": "responseStatusCode",
          "type": "tag"
        }
      ],
      "softMax": 0,
      "softMin": 0,
      "stackedBarChart": false,
      "thresholds": [],
      "timePreferance": "GLOBAL_TIME",
      "title": "List of attributes",
      "yAxisUnit": "none"
    }
  ]
}`
