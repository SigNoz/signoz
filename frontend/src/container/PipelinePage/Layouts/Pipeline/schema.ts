// JSON schema for pipelines payload.

export const PipelinesJSONSchema = JSON.parse(`
{
 "items": {
  "properties": {
   "id": {
    "type": "string"
   },
   "orderId": {
    "type": "integer"
   },
   "name": {
    "type": "string"
   },
   "alias": {
    "type": "string"
   },
   "description": {
    "type": "string"
   },
   "enabled": {
    "type": "boolean"
   },
   "filter": {
    "properties": {
     "op": {
      "type": "string"
     },
     "items": {
      "items": {
       "properties": {
        "key": {
         "properties": {
          "key": {
           "type": "string"
          },
          "dataType": {
           "type": "string"
          },
          "type": {
           "type": "string"
          },
          "isColumn": {
           "type": "boolean"
          },
          "isJSON": {
           "type": "boolean"
          }
         },
         "additionalProperties": false,
         "type": "object",
         "required": [
          "key",
          "dataType",
          "type",
          "isColumn",
          "isJSON"
         ]
        },
        "value": true,
        "op": {
         "type": "string"
        }
       },
       "additionalProperties": false,
       "type": "object",
       "required": [
        "key",
        "value",
        "op"
       ]
      },
      "type": "array"
     }
    },
    "additionalProperties": false,
    "type": "object",
    "required": [
     "op",
     "items"
    ]
   },
   "config": {
    "items": {
     "properties": {
      "type": {
       "type": "string"
      },
      "id": {
       "type": "string"
      },
      "output": {
       "type": "string"
      },
      "on_error": {
       "type": "string"
      },
      "if": {
       "type": "string"
      },
      "orderId": {
       "type": "integer"
      },
      "enabled": {
       "type": "boolean"
      },
      "name": {
       "type": "string"
      },
      "parse_to": {
       "type": "string"
      },
      "pattern": {
       "type": "string"
      },
      "regex": {
       "type": "string"
      },
      "parse_from": {
       "type": "string"
      },
      "trace_id": {
       "properties": {
        "parse_from": {
         "type": "string"
        }
       },
       "additionalProperties": false,
       "type": "object",
       "required": [
        "parse_from"
       ]
      },
      "span_id": {
       "properties": {
        "parse_from": {
         "type": "string"
        }
       },
       "additionalProperties": false,
       "type": "object",
       "required": [
        "parse_from"
       ]
      },
      "trace_flags": {
       "properties": {
        "parse_from": {
         "type": "string"
        }
       },
       "additionalProperties": false,
       "type": "object",
       "required": [
        "parse_from"
       ]
      },
      "field": {
       "type": "string"
      },
      "value": {
       "type": "string"
      },
      "from": {
       "type": "string"
      },
      "to": {
       "type": "string"
      },
      "expr": {
       "type": "string"
      },
      "routes": {
       "items": {
        "properties": {
         "output": {
          "type": "string"
         },
         "expr": {
          "type": "string"
         }
        },
        "additionalProperties": false,
        "type": "object",
        "required": [
         "output",
         "expr"
        ]
       },
       "type": "array"
      },
      "fields": {
       "items": {
        "type": "string"
       },
       "type": "array"
      },
      "default": {
       "type": "string"
      },
      "layout": {
       "type": "string"
      },
      "layout_type": {
       "type": "string"
      },
      "mapping": {
       "additionalProperties": {
        "items": {
         "type": "string"
        },
        "type": "array"
       },
       "type": "object"
      },
      "overwrite_text": {
       "type": "boolean"
      }
     },
     "additionalProperties": false,
     "type": "object",
     "required": [
      "type",
      "orderId",
      "enabled"
     ]
    },
    "type": "array"
   }
  },
  "additionalProperties": false,
  "type": "object",
  "required": [
   "id",
   "orderId",
   "name",
   "alias",
   "description",
   "enabled",
   "filter",
   "config"
  ]
 },
 "type": "array"
}
`);
