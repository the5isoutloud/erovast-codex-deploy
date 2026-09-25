# Hugo image plus `git subtree` (a separate package on Alpine), used by the
# `publish` service in docker-compose.yaml.
FROM hugomods/hugo:go-git
RUN apk add --no-cache git-subtree
