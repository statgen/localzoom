#!/usr/bin/env sh

# Deploy script based on: https://cli.vuejs.org/guide/deployment.html

# abort on errors
set -e

# Verify that the script is running on the master branch (only)
BRANCH=$(git branch --show-current)
if [ -z "$BRANCH" ] || [ "$BRANCH" != "master" ]; then
  echo 'Aborting script';
  exit 1;
fi

# build
npm run build

# navigate into the build output directory
cd dist

# if you are deploying to a custom domain
# echo 'www.example.com' > CNAME

git init
git add -A
git commit -m 'Deploy newest version'

# if you are deploying to https://<USERNAME>.github.io/<REPO>
git push -f https://github.com/statgen/localzoom.git master:gh-pages

cd -
