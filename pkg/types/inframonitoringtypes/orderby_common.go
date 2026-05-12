package inframonitoringtypes

// OrderByName sorts results by the primary groupBy column (the entity's
// name attribute). Only valid when caller does not pass an explicit GroupBy,
// i.e. when ResponseType is ResponseTypeList.
const OrderByName = "name"
