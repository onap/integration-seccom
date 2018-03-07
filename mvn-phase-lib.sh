#!/bin/bash

# ================================================================================
# Copyright (c) 2017 AT&T Intellectual Property. All rights reserved.
# ================================================================================
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
# ============LICENSE_END=========================================================


FQDN="${MVN_PROJECT_GROUPID}.${MVN_PROJECT_ARTIFACTID}"
if [ "$MVN_PROJECT_MODULEID" == "__" ]; then
  MVN_PROJECT_MODULEID=""
fi

if [[ "$MVN_PROJECT_VERSION" == *SNAPSHOT ]]; then
  echo "=> for SNAPSHOT artifact build"
  MVN_DEPLOYMENT_TYPE='SNAPSHOT'
  MVN_DOCKERREGISTRY="$MVN_DOCKERREGISTRY_SNAPSHOT"
  MVN_DOCKERREGISTRY_SERVERID="$MVN_DOCKERREGISTRY_SNAPSHOT_SERVERID"
else
  echo "=> for STAGING/RELEASE artifact build"
  MVN_DEPLOYMENT_TYPE='STAGING'
  # below is not mistake.  we only use the snapshot registry
  MVN_DOCKERREGISTRY="$MVN_DOCKERREGISTRY_SNAPSHOT"
  MVN_DOCKERREGISTRY_SERVERID="$MVN_DOCKERREGISTRY_SNAPSHOT_SERVERID"
fi
echo "MVN_DEPLOYMENT_TYPE is             [$MVN_DEPLOYMENT_TYPE]"


TIMESTAMP=$(date +%C%y%m%dT%H%M%S)

# WORKSPACE points to the current dir when the script is called, may be the root or module
if [ -z "$WORKSPACE" ]; then
  WORKSPACE=$(pwd)
fi


TIMESTAMP=$(date +%C%y%m%dT%H%M%S)



echo "MVN_PROJECT_MODULEID is            [$MVN_PROJECT_MODULEID]"
echo "MVN_PHASE is                       [$MVN_PHASE]"
echo "MVN_PROJECT_GROUPID is             [$MVN_PROJECT_GROUPID]"
echo "MVN_PROJECT_ARTIFACTID is          [$MVN_PROJECT_ARTIFACTID]"
echo "MVN_PROJECT_VERSION is             [$MVN_PROJECT_VERSION]"
echo "MVN_NEXUSPROXY is                  [$MVN_NEXUSPROXY]"
echo "MVN_RAWREPO_BASEURL_UPLOAD is      [$MVN_RAWREPO_BASEURL_UPLOAD]"
echo "MVN_RAWREPO_BASEURL_DOWNLOAD is    [$MVN_RAWREPO_BASEURL_DOWNLOAD]"
MVN_RAWREPO_HOST=$(echo "$MVN_RAWREPO_BASEURL_UPLOAD" | cut -f3 -d'/' |cut -f1 -d':')
echo "MVN_RAWREPO_HOST is                [$MVN_RAWREPO_HOST]"
echo "MVN_RAWREPO_SERVERID is            [$MVN_RAWREPO_SERVERID]"
echo "MVN_DOCKERREGISTRY is              [$MVN_DOCKERREGISTRY]"
echo "MVN_DOCKERREGISTRY_SERVERID is     [$MVN_DOCKERREGISTRY_SERVERID]"
echo "MVN_PYPISERVER_BASEURL is          [$MVN_PYPISERVER_BASEURL]"
echo "MVN_PYPISERVER_SERVERID is         [$MVN_PYPISERVER_SERVERID]"
echo "FQDN is                            [$FQDN]"
echo "MVN_PROJECT_MODULEID is            [$MVN_PROJECT_MODULEID]"
echo "MVN_DEPLOYMENT_TYPE is             [$MVN_DEPLOYMENT_TYPE]"


upload_raw_file() 
{
  # Extract the username and password to the nexus repo from the settings file
  USER=$(xpath -q -e "//servers/server[id='$MVN_RAWREPO_SERVERID']/username/text()" "$SETTINGS_FILE")
  PASS=$(xpath -q -e "//servers/server[id='$MVN_RAWREPO_SERVERID']/password/text()" "$SETTINGS_FILE")
  NETRC=$(mktemp)
  echo "machine $MVN_RAWREPO_HOST login $USER password $PASS" > "$NETRC"

  REPO="$MVN_RAWREPO_BASEURL_UPLOAD"

  OUTPUT_FILE=$1
  EXT=$(echo "$OUTPUT_FILE" | rev |cut -f1 -d '.' |rev)
  if [ "$EXT" == 'yaml' ]; then
    OUTPUT_FILE_TYPE='text/x-yaml'
  elif [ "$EXT" == 'sh' ]; then
    OUTPUT_FILE_TYPE='text/x-shellscript'
  elif [ "$EXT" == 'gz' ]; then
    OUTPUT_FILE_TYPE='application/gzip'
  elif [ "$EXT" == 'wgn' ]; then
    OUTPUT_FILE_TYPE='application/gzip'
  else
    OUTPUT_FILE_TYPE='application/octet-stream'
  fi


  if [ "$MVN_DEPLOYMENT_TYPE" == 'SNAPSHOT' ]; then
    SEND_TO="${REPO}/${FQDN}/snapshots"
  elif [ "$MVN_DEPLOYMENT_TYPE" == 'STAGING' ]; then
    SEND_TO="${REPO}/${FQDN}/releases"
  else
    echo "Unreconfnized deployment type, quit"
    exit
  fi
  if [ ! -z "$MVN_PROJECT_MODULEID" ]; then
    SEND_TO="$SEND_TO/$MVN_PROJECT_MODULEID"
  fi

  echo "Sending ${OUTPUT_FILE} to Nexus: ${SEND_TO}"
  curl -vkn --netrc-file "${NETRC}" --upload-file "${OUTPUT_FILE}" -X PUT -H "Content-Type: $OUTPUT_FILE_TYPE" "${SEND_TO}/${OUTPUT_FILE}-${MVN_PROJECT_VERSION}-${TIMESTAMP}"
  curl -vkn --netrc-file "${NETRC}" --upload-file "${OUTPUT_FILE}" -X PUT -H "Content-Type: $OUTPUT_FILE_TYPE" "${SEND_TO}/${OUTPUT_FILE}-${MVN_PROJECT_VERSION}"
  curl -vkn --netrc-file "${NETRC}" --upload-file "${OUTPUT_FILE}" -X PUT -H "Content-Type: $OUTPUT_FILE_TYPE" "${SEND_TO}/${OUTPUT_FILE}"
}



upload_wagons_and_type_yamls()
{
  WAGONS=$(ls -1 ./*.wgn)
  for WAGON in $WAGONS ; do
    WAGON_NAME=$(echo "$WAGON" | cut -f1 -d '-')
    WAGON_VERSION=$(echo "$WAGON" | cut -f2 -d '-')
    WAGON_TYPEFILE=$(grep -rl "$WAGON_NAME" | grep yaml | head -1)
   
    upload_raw_file "$WAGON"
    upload_raw_file "$WAGON_TYPEFILE"
  done
}

upload_files_of_extension()
{
  FILES=$(ls -1 ./*."$1")
  for F in $FILES ; do
    upload_raw_file "$F"
  done
}


upload_files_of_extension_rec()
{
  FILES=$(find . -name  "*.${1}")
  for F in $FILES ; do
    upload_raw_file "$F"
  done
}



build_and_push_docker()
{
  IMAGENAME="onap/${FQDN}.${MVN_PROJECT_MODULEID}"
  IMAGENAME=$(echo "$IMAGENAME" | sed -e 's/_*$//g' -e 's/\.*$//g')
  IMAGENAME=$(echo "$IMAGENAME" | tr '[:upper:]' '[:lower:]')

  # use the major and minor version of the MVN artifact version as docker image version
  VERSION="${MVN_PROJECT_VERSION//[^0-9.]/}"
  VERSION2=$(echo "$VERSION" | cut -f1-2 -d'.')

  LFQI="${IMAGENAME}:${VERSION}-${TIMESTAMP}"
  # build a docker image
  docker build --rm -f ./Dockerfile -t "${LFQI}" ./

  REPO="$MVN_DOCKERREGISTRY"
  SERVERID="$MVN_DOCKERREGISTRY_SERVERID"

  if [ ! -z "$REPO" ]; then
    USER=$(xpath -e "//servers/server[id='$SERVERID']/username/text()" "$SETTINGS_FILE")
    PASS=$(xpath -e "//servers/server[id='$SERVERID']/password/text()" "$SETTINGS_FILE")
    if [ -z "$USER" ]; then
      echo "Error: no user provided"
    fi
    if [ -z "$PASS" ]; then
      echo "Error: no password provided"
    fi
    [ -z "$PASS" ] && PASS_PROVIDED="<empty>" || PASS_PROVIDED="<password>"
    echo docker login "$REPO" -u "$USER" -p "$PASS_PROVIDED"
    docker login "$REPO" -u "$USER" -p "$PASS"

    if [ $MVN_DEPLOYMENT_TYPE == "SNAPSHOT" ]; then
      REPO="$REPO/snapshots"
    elif [ $MVN_DEPLOYMENT_TYPE == "STAGING" ]; then
      # there seems to be no staging docker registry?  set to use SNAPSHOT also
      #REPO=$MVN_DOCKERREGISTRY_RELEASE
      REPO="$REPO"
    else
      echo "Fail to determine DEPLOYMENT_TYPE"
      REPO="$REPO/unknown"
    fi

    OLDTAG="${LFQI}"
    PUSHTAGS="${REPO}/${IMAGENAME}:${VERSION2}-${TIMESTAMP} ${REPO}/${IMAGENAME}:${VERSION2} ${REPO}/${IMAGENAME}:${VERSION2}-latest"
    for NEWTAG in ${PUSHTAGS}
    do
      echo "tagging ${OLDTAG} to ${NEWTAG}"
      docker tag "${OLDTAG}" "${NEWTAG}"
      echo "pushing ${NEWTAG}"
      docker push "${NEWTAG}"
      OLDTAG="${NEWTAG}"
    done
  fi

}



push_docker_image()
{
  if [ -z "$1" ]; then
     return
  fi
  OLDTAGNAME="$1"
  OLDREPO=$(echo $TAGNAME | cut -f1 -d '/')
  IMAGENAME_W_VERSION=$(echo $TAGNAME | cut -f2- -d '/')

  # build a docker image
  docker pull "$OLDTAGNAME"

  REPO="$MVN_DOCKERREGISTRY"
  SERVERID="$MVN_DOCKERREGISTRY_SERVERID"

  if [ ! -z "$REPO" ]; then
    USER=$(xpath -e "//servers/server[id='$SERVERID']/username/text()" "$SETTINGS_FILE")
    PASS=$(xpath -e "//servers/server[id='$SERVERID']/password/text()" "$SETTINGS_FILE")
    if [ -z "$USER" ]; then
      echo "Error: no user provided"
    fi
    if [ -z "$PASS" ]; then
      echo "Error: no password provided"
    fi
    [ -z "$PASS" ] && PASS_PROVIDED="<empty>" || PASS_PROVIDED="<password>"
    echo docker login "$REPO" -u "$USER" -p "$PASS_PROVIDED"
    docker login "$REPO" -u "$USER" -p "$PASS"

    if [ $MVN_DEPLOYMENT_TYPE == "SNAPSHOT" ]; then
      REPO="$REPO/snapshots"
    elif [ $MVN_DEPLOYMENT_TYPE == "STAGING" ]; then
      # there seems to be no staging docker registry?  set to use SNAPSHOT also
      #REPO=$MVN_DOCKERREGISTRY_RELEASE
      REPO="$REPO"
    else
      echo "Fail to determine DEPLOYMENT_TYPE"
      REPO="$REPO/unknown"
    fi

    OLDTAG="${OLDTAGNAME}"
    PUSHTAGS="${REPO}/${IMAGENAME_W_VERSION}-${TIMESTAMP} ${REPO}/${IMAGENAME_W_VERSION} ${REPO}/${IMAGENAME_W_VERSION}-latest"
    for NEWTAG in ${PUSHTAGS}
    do
      echo "tagging ${OLDTAG} to ${NEWTAG}"
      docker tag "${OLDTAG}" "${NEWTAG}"
      echo "pushing ${NEWTAG}"
      docker push "${NEWTAG}"
      OLDTAG="${NEWTAG}"
    done
  fi

}



