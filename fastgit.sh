#!/bin/bash

NOW=`date -u +"%Y-%m-%dT%H:%M:%SZ"`

while getopts 'ct' flag; do
   case "${flag}" in
      c) COMMIT='true' ;;
      t) TAG='true' ;;
   esac
done
shift $(($OPTIND-1))

if [ "$#" -lt "1" ]
then
   echo "You must enter a git message!"
   exit
fi

./recache.sh

if [ "${TAG}" == "true" ]
then
   last=`git tag | tail -n 1`
   next=`expr "$last" + 1`
   nexttag=`printf "%05d\n" "$next"`
   echo "Updating to tag: $nexttag"
   sed -i "s/data-frontendrelease>[^<]\+/data-frontendrelease>${nexttag} (${NOW})/g" "index.html"
fi

if [ "${COMMIT}" == "true" ]
then
   echo "Committing with message: $1"
   git add --all
   git commit -m "$1"
   git push
fi

if [ ! -z "$nexttag" ]
then
   echo "Creating + pushing tag $nexttag"
   git tag "$nexttag"
   git push --tags
fi

