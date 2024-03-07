files="";

# lint-staged will pass all files in $1 $2 $3 etc. iterate and concat.
for var in "$@"
do
    files="$files \"$var\","
done

# create temporary tsconfig which includes only passed files
str="{
  \"extends\": \"./tsconfig.json\",
  \"include\": [ \"src/typings/**/*.ts\",\"src/**/*.d.ts\", \"./babel.config.js\", \"./jest.config.ts\", \"./.eslintrc.js\",\"./__mocks__\",\"./conf/default.conf\",\"./public\",\"./tests\",\"./playwright.config.ts\",\"./commitlint.config.ts\",\"./webpack.config.js\",\"./webpack.config.prod.js\",\"./jest.setup.ts\",\"./**/*.d.ts\",$files]
}"
echo $str > tsconfig.tmp

# run typecheck using temp config
tsc -p ./tsconfig.tmp

# capture exit code of tsc
code=$?

# delete temp config
rm ./tsconfig.tmp

exit $code
