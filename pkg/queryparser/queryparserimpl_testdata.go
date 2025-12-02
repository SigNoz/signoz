package queryparser

var (
	builderQueryWithGrouping = `
	{
	  "queryType":"builder",
	  "panelType":"graph",
	  "queries":[
	    {
	      "type":"builder_query",
	      "spec":{
	        "name":"A",
	        "signal":"metrics",
	        "stepInterval":null,
	        "disabled":false,
	        "filter":{"expression":""},
	        "groupBy":[
	          {"name":"service_name","fieldDataType":"","fieldContext":""},
	          {"name":"env","fieldDataType":"","fieldContext":""}
	        ],
	        "aggregations":[
	          {"metricName":"test_metric_cardinality","timeAggregation":"count","spaceAggregation":"sum"},
	          {"metricName":"cpu_usage_total","timeAggregation":"avg","spaceAggregation":"avg"}
	        ]
	      }
	    }
	  ]
	}
	`

	builderQuerySingleGrouping = `
	{
	  "queryType":"builder",
	  "panelType":"graph",
	  "queries":[
	    {
	      "type":"builder_query",
	      "spec":{
	        "name":"B",
	        "signal":"metrics",
	        "stepInterval":null,
	        "disabled":false,
	        "groupBy":[
	          {"name":"namespace","fieldDataType":"","fieldContext":""}
	        ],
	        "aggregations":[
	          {"metricName":"latency_p50","timeAggregation":"avg","spaceAggregation":"max"}
	        ]
	      }
	    }
	  ]
	}
	`

	builderQueryNoGrouping = `
	{
	  "queryType":"builder",
	  "panelType":"graph",
	  "queries":[
	    {
	      "type":"builder_query",
	      "spec":{
	        "name":"C",
	        "signal":"metrics",
	        "stepInterval":null,
	        "disabled":false,
	        "groupBy":[],
	        "aggregations":[
	          {"metricName":"disk_usage_total","timeAggregation":"sum","spaceAggregation":"sum"}
	        ]
	      }
	    }
	  ]
	}
	`

	promQueryWithGrouping = `
	{
	  "queries":[
	    {
	      "type":"promql",
	      "spec":{
	        "name":"P1",
	        "query":"sum by (pod,region) (rate(http_requests_total[5m]))",
	        "disabled":false,
	        "step":0,
	        "stats":false
	      }
	    }
	  ],
	  "panelType":"graph",
	  "queryType":"promql"
	}
	`

	promQuerySingleGrouping = `
	{
	  "queries":[
	    {
	      "type":"promql",
	      "spec":{
	        "name":"P2",
	        "query":"sum by (env)(rate(cpu_usage_seconds_total{job=\"api\"}[5m]))",
	        "disabled":false,
	        "step":0,
	        "stats":false
	      }
	    }
	  ],
	  "panelType":"graph",
	  "queryType":"promql"
	}
	`

	promQueryNoGrouping = `
	{
	  "queries":[
	    {
	      "type":"promql",
	      "spec":{
	        "name":"P3",
	        "query":"rate(node_cpu_seconds_total[1m])",
	        "disabled":false,
	        "step":0,
	        "stats":false
	      }
	    }
	  ],
	  "panelType":"graph",
	  "queryType":"promql"
	}
	`

	clickHouseQueryWithGrouping = `
{
  "queryType":"clickhouse_sql",
  "panelType":"graph",
  "queries":[
    {
      "type":"clickhouse_sql",
      "spec":{
        "name":"CH1",
        "query":"SELECT region as r, zone FROM metrics WHERE metric_name='cpu' GROUP BY region, zone",
        "disabled":false
      }
    }
  ]
}
`

	clickHouseQuerySingleGrouping = `
{
  "queryType":"clickhouse_sql",
  "panelType":"graph",
  "queries":[
    {
      "type":"clickhouse_sql",
      "spec":{
        "name":"CH2",
        "query":"SELECT region as r FROM metrics WHERE metric_name='cpu_usage' GROUP BY region",
        "disabled":false
      }
    }
  ]
}
`

	clickHouseQueryNoGrouping = `
	{
	  "queryType":"clickhouse_sql",
	  "panelType":"graph",
	  "queries":[
	    {
	      "type":"clickhouse_sql",
	      "spec":{
	        "name":"CH3",
	        "query":"SELECT * FROM metrics WHERE metric_name = 'memory_usage'",
	        "disabled":false
	      }
	    }
	  ]
	}
	`
)
