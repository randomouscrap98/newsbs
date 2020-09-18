#!/bin/bash

./recache.sh

if [ "$#" -ne "1" ]
then
   echo "You must enter a git message!"
   exit
fi

git add --all
git commit -m "$1"
git push

