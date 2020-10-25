#!/bin/bash

./recache.sh

if [ "$#" -lt "1" ]
then
   echo "You must enter a git message!"
   exit
fi

git add --all
git commit -m "$1"
git push

if [ "$#" -gt "1" ]
then
   git tag "$2"
   git push --tags
fi

