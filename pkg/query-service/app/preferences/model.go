package preferences

import (
	"context"
	"fmt"

	"github.com/jmoiron/sqlx"
	"go.signoz.io/signoz/pkg/query-service/common"
	"go.signoz.io/signoz/pkg/query-service/model"
)

var db *sqlx.DB

type UserPreference struct {
	PreferenceKey   string `json:"preference_key" db:"preference_key"`
	PreferenceValue string `json:"preference_value" db:"preference_value"`
}
type Preference struct {
	Id           string `json:"id" db:"id"`
	Name         string `json:"name" db:"name"`
	DefaultValue string `json:"default_value" db:"default_value"`
	DependsOn    string `json:"depends_on" db:"depends_on"`
	UserScope    int    `json:"userEnabled" db:"user"`
	OrgScope     int    `json:"orgEnabled" db:"org"`
}

type UserPreferenceWithDefault struct {
	UserPreference
	DefaultValue string `json:"default_value" db:"default_value"`
}

type UpdateUserPreferenceRequest struct {
	PreferenceKey   string `json:"preference_key"`
	PreferenceValue string `json:"preference_value"`
}

type UpdateUserPreferenceResponse struct {
	PreferenceKey   string `json:"preference_key"`
	PreferenceValue string `json:"preference_value"`
}

func InitDB(datasourceName string) error {
	var err error

	db, err = sqlx.Open("sqlite3", datasourceName)

	if err != nil {
		return err
	}

	// create the preference entity
	table_schema := `CREATE TABLE IF NOT EXISTS preference(
		id TEXT PRIMARY KEY NOT NULL,
		name TEXT,
		default_value TEXT,
		depends_on TEXT,
		user INTEGER DEFAULT 0,
		org INTEGER DEFAULT 0
	);`

	_, err = db.Exec(table_schema)
	if err != nil {
		return fmt.Errorf("error in creating preference table: %s", err.Error())
	}

	// create the preference group entity
	table_schema = `CREATE TABLE IF NOT EXISTS preference_group(
		id TEXT PRIMARY KEY NOT NULL,
		name TEXT,
		parent_group TEXT
	);`

	_, err = db.Exec(table_schema)
	if err != nil {
		return fmt.Errorf("error in creating preference group table: %s", err.Error())
	}

	// create the relational table between preference and preference group
	table_schema = `
	PRAGMA foreign_keys = ON;
	CREATE TABLE IF NOT EXISTS preference_to_group (
    	preference_id TEXT NOT NULL,
    	preference_group_id TEXT NOT NULL,
    	PRIMARY KEY (preference_id, preference_group_id),
    	FOREIGN KEY (preference_id)
        	REFERENCES preference(id)
        	ON UPDATE CASCADE
        	ON DELETE CASCADE,
    	FOREIGN KEY (preference_group_id)
        	REFERENCES preference_group(id)
        	ON UPDATE CASCADE
        	ON DELETE CASCADE
);`

	_, err = db.Exec(table_schema)
	if err != nil {
		return fmt.Errorf("error in creating preference_to_group table: %s", err.Error())
	}

	// create the user preference table
	table_schema = `
	PRAGMA foreign_keys = ON;
	CREATE TABLE IF NOT EXISTS user_preference(
		preference_key TEXT NOT NULL,
		preference_value TEXT,
		user_id TEXT NOT NULL,
		PRIMARY KEY (preference_key,user_id),
		FOREIGN KEY (preference_key)
			REFERENCES preference(id)
			ON UPDATE CASCADE 
			ON DELETE CASCADE,
		FOREIGN KEY (user_id)
			REFERENCES users(id)
			ON UPDATE CASCADE
			ON DELETE CASCADE
	);`

	_, err = db.Exec(table_schema)
	if err != nil {
		return fmt.Errorf("error in creating user_preference table: %s", err.Error())
	}

	// create the org preference table
	table_schema = `
	PRAGMA foreign_keys = ON;
	CREATE TABLE IF NOT EXISTS org_preference(
		preference_key TEXT NOT NULL,
		preference_value TEXT,
		org_id TEXT NOT NULL,
		PRIMARY KEY (preference_key,org_id),
		FOREIGN KEY (preference_key)
			REFERENCES preference(id)
			ON UPDATE CASCADE 
			ON DELETE CASCADE,
		FOREIGN KEY (org_id)
			REFERENCES organizations(id)
			ON UPDATE CASCADE
			ON DELETE CASCADE
	);`

	_, err = db.Exec(table_schema)
	if err != nil {
		return fmt.Errorf("error in creating org_preference table: %s", err.Error())
	}

	// if there is no error then return nil
	return nil
}

func GetUserPreference(ctx context.Context, preferenceKey string) (*UserPreferenceWithDefault, *model.ApiError) {
	userPreference := []UserPreference{}
	user := common.GetUserFromContext(ctx)

	// get the preference key and value from the user preference table
	query := `SELECT preference_key, preference_value FROM user_preference WHERE preference_key = $1 AND user_id = $2;`
	err := db.Select(&userPreference, query, preferenceKey, user.Id)

	if err != nil {
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: err}
	}

	// get the details for the preference entity
	preference := Preference{}
	query = `SELECT user, default_value FROM preference WHERE id = $1;`
	err = db.Get(&preference, query, preferenceKey)

	// return if unable to fetch the preference entity as we won't be sure about preference being enabled or not
	if err != nil {
		return nil, &model.ApiError{Typ: model.ErrorNotFound, Err: fmt.Errorf("error while fetching the preference entity: %s", preferenceKey)}
	}

	// return err if the preference is not enabled for user scope
	if preference.UserScope != 1 {
		return nil, &model.ApiError{Typ: model.ErrorNotFound, Err: fmt.Errorf("preference not enabled with key: %s", preferenceKey)}
	}

	userPreferenceWithDefault := UserPreferenceWithDefault{}

	if len(userPreference) == 0 {
		userPreferenceWithDefault.PreferenceKey = preferenceKey
		userPreferenceWithDefault.PreferenceValue = ""
	} else if len(userPreference) == 1 {
		userPreferenceWithDefault.PreferenceKey = userPreference[0].PreferenceKey
		userPreferenceWithDefault.PreferenceValue = userPreference[0].PreferenceValue
	} else {
		return nil, &model.ApiError{Typ: model.ErrorBadData, Err: fmt.Errorf("more than one value found for preference key: %s", preferenceKey)}
	}

	userPreferenceWithDefault.DefaultValue = preference.DefaultValue

	return &userPreferenceWithDefault, nil
}

func UpdateUserPreference(ctx context.Context, req *UpdateUserPreferenceRequest) (*UpdateUserPreferenceResponse, *model.ApiError) {
	preferenceKey := req.PreferenceKey
	preferenceValue := req.PreferenceValue
	user := common.GetUserFromContext(ctx)

	userPreference := []UserPreference{}

	// return error if there is no preference key in the request
	if preferenceKey == "" {
		return nil, &model.ApiError{Typ: model.ErrorNotFound, Err: fmt.Errorf("no preference key found in the request")}
	}

	query := `SELECT preference_key FROM user_preference WHERE preference_key= $1 AND user_id= $2;`
	err := db.Select(&userPreference, query, preferenceKey, user.Id)

	if err != nil {
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error in getting the preference value: %s", err)}
	}

	if len(userPreference) == 0 {
		query = `INSERT INTO user_preference(preference_key,preference_value,user_id) VALUES($1,$2,$3);`
		_, err = db.Exec(query, preferenceKey, preferenceValue, user.Id)

		if err != nil {
			return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error in setting the preference value: %s", err)}
		}

	} else if len(userPreference) == 1 {
		query = `UPDATE user_preference SET preference_value= $1 WHERE preference_key=$2 AND user_id=$3;`
		_, err = db.Exec(query, preferenceValue, preferenceKey, user.Id)
		// return the error if the update statement fails
		if err != nil {
			return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error in setting the preference value: %s", err)}
		}
	} else {
		return nil, &model.ApiError{Typ: model.ErrorBadData, Err: fmt.Errorf("more than one value found for preference: %s", err)}
	}

	return &UpdateUserPreferenceResponse{
		PreferenceKey:   preferenceKey,
		PreferenceValue: preferenceValue,
	}, nil
}
