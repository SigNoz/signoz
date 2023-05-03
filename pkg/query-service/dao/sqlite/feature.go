package sqlite

import (
	"go.signoz.io/signoz/pkg/query-service/model"
)

func (mds *ModelDaoSqlite) CreateFeature(req *model.Feature) *model.ApiError {

	_, err := mds.db.Exec(
		`INSERT INTO feature_status (name, active, usage, usage_limit, route)
		VALUES (?, ?, ?, ?, ?);`,
		req.Name, req.Active, req.Usage, req.UsageLimit, req.Route)
	if err != nil {
		return &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}
	return nil
}

func (mds *ModelDaoSqlite) GetFeature(featureName string) (model.Feature, error) {

	var feature model.Feature

	err := mds.db.Get(&feature,
		`SELECT * FROM feature_status WHERE name = ?;`, featureName)
	if err != nil {
		return feature, err
	}

	return feature, nil
}

func (mds *ModelDaoSqlite) GetAllFeatures() ([]model.Feature, error) {

	var feature []model.Feature

	err := mds.db.Select(&feature,
		`SELECT * FROM feature_status;`)
	if err != nil {
		return feature, err
	}

	return feature, nil
}

func (mds *ModelDaoSqlite) UpdateFeature(req model.Feature) error {

	_, err := mds.db.Exec(
		`UPDATE feature_status SET active = ?, usage = ?, usage_limit = ?, route = ? WHERE name = ?;`,
		req.Active, req.Usage, req.UsageLimit, req.Route, req.Name)
	if err != nil {
		return err
	}
	return nil
}

func (mds *ModelDaoSqlite) InitFeatures(req model.FeatureSet) error {
	// get a feature by name, if it doesn't exist, create it. If it does exist, update it.
	for _, feature := range req {
		currentFeature, err := mds.GetFeature(feature.Name)
		if err != nil {
			err := mds.CreateFeature(&feature)
			if err != nil {
				return err
			}
			continue
		}
		feature.Usage = currentFeature.Usage
		if feature.Usage >= feature.UsageLimit && feature.UsageLimit != -1 {
			feature.Active = false
		}
		err = mds.UpdateFeature(feature)
		if err != nil {
			return err
		}
	}
	return nil
}
