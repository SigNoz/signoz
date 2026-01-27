package telemetrytypes

// ============================================================================
// Test JSON Type Set Data Setup
// ============================================================================

// TestJSONTypeSet returns a map of path->types for testing
// This represents the type information available in the test JSON structure
func TestJSONTypeSet() (map[string][]JSONDataType, MetadataStore) {
	types := map[string][]JSONDataType{
		"user.name":                                           {String},
		"user.permissions":                                    {ArrayString},
		"user.age":                                            {Int64, String},
		"user.height":                                         {Float64},
		"education":                                           {ArrayJSON},
		"education[].name":                                    {String},
		"education[].type":                                    {String, Int64},
		"education[].internal_type":                           {String},
		"education[].metadata.location":                       {String},
		"education[].parameters":                              {ArrayFloat64, ArrayDynamic},
		"education[].duration":                                {String},
		"education[].mode":                                    {String},
		"education[].year":                                    {Int64},
		"education[].field":                                   {String},
		"education[].awards":                                  {ArrayDynamic, ArrayJSON},
		"education[].awards[].name":                           {String},
		"education[].awards[].rank":                           {Int64},
		"education[].awards[].medal":                          {String},
		"education[].awards[].type":                           {String},
		"education[].awards[].semester":                       {Int64},
		"education[].awards[].participated":                   {ArrayDynamic, ArrayJSON},
		"education[].awards[].participated[].type":            {String},
		"education[].awards[].participated[].field":           {String},
		"education[].awards[].participated[].project_type":    {String},
		"education[].awards[].participated[].project_name":    {String},
		"education[].awards[].participated[].race_type":       {String},
		"education[].awards[].participated[].team_based":      {Bool},
		"education[].awards[].participated[].team_name":       {String},
		"education[].awards[].participated[].team":            {ArrayJSON},
		"education[].awards[].participated[].members":         {ArrayString},
		"education[].awards[].participated[].team[].name":     {String},
		"education[].awards[].participated[].team[].branch":   {String},
		"education[].awards[].participated[].team[].semester": {Int64},
		"interests":                                                                  {ArrayJSON},
		"interests[].type":                                                           {String},
		"interests[].entities":                                                       {ArrayJSON},
		"interests[].entities.application_date":                                      {String},
		"interests[].entities[].reviews":                                             {ArrayJSON},
		"interests[].entities[].reviews[].given_by":                                  {String},
		"interests[].entities[].reviews[].remarks":                                   {String},
		"interests[].entities[].reviews[].weight":                                    {Float64},
		"interests[].entities[].reviews[].passed":                                    {Bool},
		"interests[].entities[].reviews[].type":                                      {String},
		"interests[].entities[].reviews[].analysis_type":                             {Int64},
		"interests[].entities[].reviews[].entries":                                   {ArrayJSON},
		"interests[].entities[].reviews[].entries[].subject":                         {String},
		"interests[].entities[].reviews[].entries[].status":                          {String},
		"interests[].entities[].reviews[].entries[].metadata":                        {ArrayJSON},
		"interests[].entities[].reviews[].entries[].metadata[].company":              {String},
		"interests[].entities[].reviews[].entries[].metadata[].experience":           {Int64},
		"interests[].entities[].reviews[].entries[].metadata[].unit":                 {String},
		"interests[].entities[].reviews[].entries[].metadata[].positions":            {ArrayJSON},
		"interests[].entities[].reviews[].entries[].metadata[].positions[].name":     {String},
		"interests[].entities[].reviews[].entries[].metadata[].positions[].duration": {Int64, Float64},
		"interests[].entities[].reviews[].entries[].metadata[].positions[].unit":     {String},
		"interests[].entities[].reviews[].entries[].metadata[].positions[].ratings":  {ArrayInt64, ArrayString},
		"message": {String},
	}

	return types, nil
}
