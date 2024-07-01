package preferences

import (
	"context"
	"encoding/json"
	"fmt"
	"io/fs"
	"os"

	"github.com/jmoiron/sqlx"
	"go.signoz.io/signoz/pkg/query-service/common"
	"go.signoz.io/signoz/pkg/query-service/model"
)

var db *sqlx.DB

type UserPreference struct {
	PreferenceKey   string `json:"preference_key" db:"preference_key"`
	PreferenceValue string `json:"preference_value" db:"preference_value"`
}

type OrgPreference struct {
	PreferenceKey   string `json:"preference_key" db:"preference_key"`
	PreferenceValue string `json:"preference_value" db:"preference_value"`
}
type Preference struct {
	Id           string `json:"id" db:"id"`
	Name         string `json:"name" db:"name"`
	DefaultValue string `json:"default_value" db:"default_value"`
	DependsOn    string `json:"depends_on" db:"depends_on"`
	UserScope    int    `json:"user" db:"user"`
	OrgScope     int    `json:"org" db:"org"`
}

type PreferenceGroup struct {
	Id          string `json:"id" db:"id"`
	Name        string `json:"name" db:"name"`
	ParentGroup string `json:"parent_group" db:"parent_group"`
}

type PreferenceToGroup struct {
	PreferenceId      string `json:"preference_id" db:"preference_id"`
	PreferenceGroupId string `json:"preference_group_id" db:"preference_group_id"`
}

type UserPreferenceWithDefault struct {
	UserPreference
	DefaultValue string `json:"default_value" db:"default_value"`
}

type UpdateUserPreferenceRequest struct {
	PreferenceKey   string `json:"preference_key"`
	PreferenceValue string `json:"preference_value"`
}

type UpdateOrgPreferenceRequest struct {
	OrgId           string `json:"org_id"`
	PreferenceKey   string `json:"preference_key"`
	PreferenceValue string `json:"preference_value"`
}

type UpdateUserPreferenceResponse struct {
	PreferenceKey   string `json:"preference_key"`
	PreferenceValue string `json:"preference_value"`
}

type UpdateOrgPreferenceResponse struct {
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

	// bootstrap the preference entity data
	bootstrapPreferences, fileError := fs.ReadFile(os.DirFS("../../pkg/query-service/app/preferences"), "bootstrap_preferences.json")

	if fileError != nil {
		return fmt.Errorf("error in reading bootstrap preferences: %s", fileError.Error())
	}

	preferences := []Preference{}

	if unmarshalErr := json.Unmarshal(bootstrapPreferences, &preferences); unmarshalErr != nil {
		return fmt.Errorf("error in unmarshalling bootstrap preferences: %s", unmarshalErr.Error())
	}

	for _, preference := range preferences {

		var preferenceFromDB []Preference
		query := `SELECT id FROM preference WHERE id=$1;`
		err = db.Select(&preferenceFromDB, query, preference.Id)

		if err != nil {
			return fmt.Errorf("error in finding bootstrap entries in preference entity: %s", err.Error())
		}

		if len(preferenceFromDB) == 0 {
			query = `INSERT INTO preference(id,name,default_value,depends_on,user,org) VALUES($1,$2,$3,$4,$5,$6);`

			_, err = db.Exec(query, preference.Id, preference.Name, preference.DefaultValue, preference.DependsOn, preference.UserScope, preference.OrgScope)

			if err != nil {
				return fmt.Errorf("error in adding bootstrap preference: %s", err.Error())
			}
		} else if len(preferenceFromDB) > 1 {
			return fmt.Errorf("multiple entries found for preference entity while bootstrapping: %s", preference.Id)
		}

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
	// bootstrap the preference group entity data
	bootstrapPreferenceGroup, fileError := fs.ReadFile(os.DirFS("../../pkg/query-service/app/preferences"), "bootstrap_preference_groups.json")

	if fileError != nil {
		return fmt.Errorf("error in reading bootstrap preference group: %s", fileError.Error())
	}

	preferenceGroups := []PreferenceGroup{}

	if unmarshalErr := json.Unmarshal(bootstrapPreferenceGroup, &preferenceGroups); unmarshalErr != nil {
		return fmt.Errorf("error in unmarshalling bootstrap preference groups: %s", unmarshalErr.Error())
	}

	for _, preferenceGroup := range preferenceGroups {

		var preferenceGroupFromDB []PreferenceGroup
		query := `SELECT id FROM preference_group WHERE id=$1;`
		err = db.Select(&preferenceGroupFromDB, query, preferenceGroup.Id)

		if err != nil {
			return fmt.Errorf("error in finding bootstrap entries in preference group entity: %s", err.Error())
		}

		if len(preferenceGroupFromDB) == 0 {
			query = `INSERT INTO preference_group(id,name,parent_group) VALUES($1,$2,$3);`

			_, err = db.Exec(query, preferenceGroup.Id, preferenceGroup.Name, preferenceGroup.ParentGroup)

			if err != nil {
				return fmt.Errorf("error in adding bootstrap preference group: %s", err.Error())
			}
		} else if len(preferenceGroupFromDB) > 1 {
			return fmt.Errorf("multiple entries found for preference group entity while bootstrapping: %s", preferenceGroup.Id)
		}

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
	// bootstrap the preference_to_group relational table data
	bootstrapPreferenceToGroup, fileError := fs.ReadFile(os.DirFS("../../pkg/query-service/app/preferences"), "bootstrap_preference_to_group.json")

	if fileError != nil {
		return fmt.Errorf("error in reading bootstrap preference to group: %s", fileError.Error())
	}

	preferenceToGroups := []PreferenceToGroup{}

	if unmarshalErr := json.Unmarshal(bootstrapPreferenceToGroup, &preferenceToGroups); unmarshalErr != nil {
		return fmt.Errorf("error in unmarshalling bootstrap preference to group: %s", unmarshalErr.Error())
	}

	for _, preferenceToGroup := range preferenceToGroups {

		var preferenceToGroupFromDB []PreferenceToGroup
		query := `SELECT id FROM preference_to_group WHERE preference_id=$1 AND preference_group_id=$2;`
		err = db.Select(&preferenceToGroupFromDB, query, preferenceToGroup.PreferenceId, preferenceToGroup.PreferenceGroupId)

		if err != nil {
			return fmt.Errorf("error in finding bootstrap entries in preference to group entity: %s", err.Error())
		}

		if len(preferenceToGroupFromDB) == 0 {
			query = `INSERT INTO preference_to_group(preference_id,preference_group_id) VALUES($1,$2);`

			_, err = db.Exec(query, preferenceToGroup.PreferenceId, preferenceToGroup.PreferenceGroupId)

			if err != nil {
				return fmt.Errorf("error in adding bootstrap preference to group: %s", err.Error())
			}
		} else if len(preferenceToGroupFromDB) > 1 {
			return fmt.Errorf("multiple entries found for preference to group entity while bootstrapping: %s and %s", preferenceToGroup.PreferenceId, preferenceToGroup.PreferenceGroupId)
		}

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

// todo [vikrantgupta25]: take care of depends_on field here itself!
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

	// return the error if the select statement to find the current user preferences fails
	if err != nil {
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error in getting the preference value: %s", err)}
	}

	if len(userPreference) == 0 {
		query = `INSERT INTO user_preference(preference_key,preference_value,user_id) VALUES($1,$2,$3);`
		_, err = db.Exec(query, preferenceKey, preferenceValue, user.Id)

		// return the error if the insert statement fails
		if err != nil {
			return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error in setting the preference value: %s", err)}
		}

		// query = `UPDATE preference SET user=1 WHERE depends_on=$1;`
		// _, err = db.Exec(query, preferenceKey)

		// if err != nil {
		// 	return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error in updating the dependent preference entities: %s", err)}
		// }

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

func GetOrgPreference(ctx context.Context, preferenceKey string, orgId string) (*UserPreferenceWithDefault, *model.ApiError) {
	orgPreference := []OrgPreference{}

	// get the preference key and value from the org preference table
	query := `SELECT preference_key, preference_value FROM org_preference WHERE preference_key = $1 AND org_id = $2;`
	err := db.Select(&orgPreference, query, preferenceKey, orgId)

	if err != nil {
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: err}
	}

	// get the details for the preference entity
	preference := Preference{}
	query = `SELECT org, default_value FROM preference WHERE id = $1;`
	err = db.Get(&preference, query, preferenceKey)

	// return if unable to fetch the preference entity as we won't be sure about preference being enabled or not
	if err != nil {
		return nil, &model.ApiError{Typ: model.ErrorNotFound, Err: fmt.Errorf("error while fetching the preference entity: %s", preferenceKey)}
	}

	// return err if the preference is not enabled for org scope
	if preference.OrgScope != 1 {
		return nil, &model.ApiError{Typ: model.ErrorNotFound, Err: fmt.Errorf("preference not enabled with key: %s", preferenceKey)}
	}

	orgPreferenceWithDefault := UserPreferenceWithDefault{}

	if len(orgPreference) == 0 {
		orgPreferenceWithDefault.PreferenceKey = preferenceKey
		orgPreferenceWithDefault.PreferenceValue = ""
	} else if len(orgPreference) == 1 {
		orgPreferenceWithDefault.PreferenceKey = orgPreference[0].PreferenceKey
		orgPreferenceWithDefault.PreferenceValue = orgPreference[0].PreferenceValue
	} else {
		return nil, &model.ApiError{Typ: model.ErrorBadData, Err: fmt.Errorf("more than one value found for preference key: %s", preferenceKey)}
	}

	orgPreferenceWithDefault.DefaultValue = preference.DefaultValue

	return &orgPreferenceWithDefault, nil
}

// todo [vikrantgupta25]: take care of depends_on field here itself!
func UpdateOrgPreference(ctx context.Context, req *UpdateOrgPreferenceRequest) (*UpdateOrgPreferenceResponse, *model.ApiError) {
	preferenceKey := req.PreferenceKey
	preferenceValue := req.PreferenceValue
	orgId := req.OrgId

	orgPreference := []OrgPreference{}

	// return error if there is no preference key in the request
	if preferenceKey == "" {
		return nil, &model.ApiError{Typ: model.ErrorNotFound, Err: fmt.Errorf("no preference key found in the request")}
	}

	if orgId == "" {
		return nil, &model.ApiError{Typ: model.ErrorNotFound, Err: fmt.Errorf("no org id found in the request")}
	}

	query := `SELECT preference_key FROM org_preference WHERE preference_key= $1 AND org_id= $2;`
	err := db.Select(&orgPreference, query, preferenceKey, orgId)

	// return the error if the select statement to find the current org preferences fails
	if err != nil {
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error in getting the preference value: %s", err)}
	}

	if len(orgPreference) == 0 {
		query = `INSERT INTO org_preference(preference_key,preference_value,org_id) VALUES($1,$2,$3);`
		_, err = db.Exec(query, preferenceKey, preferenceValue, orgId)

		// return the error if the insert statement fails
		if err != nil {
			return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error in setting the preference value: %s", err)}
		}

	} else if len(orgPreference) == 1 {
		query = `UPDATE org_preference SET preference_value= $1 WHERE preference_key=$2 AND org_id=$3;`
		_, err = db.Exec(query, preferenceValue, preferenceKey, orgId)
		// return the error if the update statement fails
		if err != nil {
			return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error in setting the preference value: %s", err)}
		}
	} else {
		return nil, &model.ApiError{Typ: model.ErrorBadData, Err: fmt.Errorf("more than one value found for preference: %s", err)}
	}

	return &UpdateOrgPreferenceResponse{
		PreferenceKey:   preferenceKey,
		PreferenceValue: preferenceValue,
	}, nil
}
