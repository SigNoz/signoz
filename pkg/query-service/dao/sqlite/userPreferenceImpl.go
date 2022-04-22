package sqlite

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"go.signoz.io/query-service/model"
	"go.signoz.io/query-service/telemetry"
	"go.uber.org/zap"
)

func (mds *ModelDaoSqlite) FetchUserPreference(ctx context.Context) (*model.UserPreferences, *model.ApiError) {

	userPreferences := []model.UserPreferences{}
	query := fmt.Sprintf("SELECT id, uuid, isAnonymous, hasOptedUpdates FROM user_preferences;")

	err := mds.db.Select(&userPreferences, query)

	if err != nil {
		zap.S().Debug("Error in processing sql query: ", err)
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	// zap.S().Info(query)
	if len(userPreferences) > 1 {
		zap.S().Debug("Error in processing sql query: ", fmt.Errorf("more than 1 row in user_preferences found"))
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	if len(userPreferences) == 0 {
		return nil, nil
	}

	return &userPreferences[0], nil

}

func (mds *ModelDaoSqlite) UpdateUserPreferece(ctx context.Context, userPreferences *model.UserPreferences) *model.ApiError {

	tx, err := mds.db.Begin()
	if err != nil {
		return &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	userPreferencesFound, apiError := mds.FetchUserPreference(ctx)
	if apiError != nil {
		return apiError
	}

	stmt, err := tx.Prepare(`UPDATE user_preferences SET isAnonymous=$1, hasOptedUpdates=$2 WHERE id=$3;`)
	defer stmt.Close()

	if err != nil {
		zap.S().Errorf("Error in preparing statement for INSERT to user_preferences\n", err)
		tx.Rollback()
		return &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	query_result, err := stmt.Exec(userPreferences.GetIsAnonymous(), userPreferences.GetHasOptedUpdate(), userPreferencesFound.GetId())
	if err != nil {
		zap.S().Errorf("Error in Executing prepared statement for INSERT to user_preferences\n", err)
		tx.Rollback() // return an error too, we may want to wrap them
		return &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}
	zap.S().Debug(query_result.RowsAffected())
	zap.S().Debug(userPreferences.GetIsAnonymous(), userPreferences.GetHasOptedUpdate(), userPreferencesFound.GetId())

	err = tx.Commit()
	if err != nil {
		zap.S().Errorf("Error in committing transaction for INSERT to user_preferences\n", err)
		return &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}
	telemetry.GetInstance().SetTelemetryAnonymous(userPreferences.GetIsAnonymous())

	return nil
}

func (mds *ModelDaoSqlite) CreateDefaultUserPreference(ctx context.Context) (*model.UserPreferences, *model.ApiError) {

	uuid := uuid.New().String()
	_, err := mds.db.ExecContext(ctx, `INSERT INTO user_preferences (uuid, isAnonymous, hasOptedUpdates) VALUES (?, 0, 1);`, uuid)

	if err != nil {
		zap.S().Errorf("Error in preparing statement for INSERT to user_preferences\n", err)
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	return mds.FetchUserPreference(ctx)

}
