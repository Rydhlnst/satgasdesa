#!/bin/sh
set -eu

: "${MYSQL_DATABASE:?MYSQL_DATABASE is required}"
: "${MYSQL_USER:?MYSQL_USER is required}"
: "${MYSQL_PASSWORD:?MYSQL_PASSWORD is required}"
: "${MYSQL_ROOT_PASSWORD:?MYSQL_ROOT_PASSWORD is required}"

case "$MYSQL_DATABASE" in
  *[!A-Za-z0-9_]* | "")
    echo "MYSQL_DATABASE must use only letters, numbers, and underscores." >&2
    exit 64
    ;;
esac

case "$MYSQL_USER" in
  *[!A-Za-z0-9_]* | "")
    echo "MYSQL_USER must use only letters, numbers, and underscores." >&2
    exit 64
    ;;
esac

marker_file="/var/run/mysqld/.satgas-app-user-ready"
rm -f "$marker_file"

/usr/local/bin/docker-entrypoint.sh mysqld "$@" &
mysql_pid=$!

stop_mysql() {
  kill -TERM "$mysql_pid" 2>/dev/null || true
  wait "$mysql_pid" 2>/dev/null || true
  exit 0
}

trap stop_mysql INT TERM

attempt=0
while [ "$attempt" -lt 60 ]; do
  if MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysqladmin \
    --protocol=socket \
    --socket=/var/run/mysqld/mysqld.sock \
    --user=root \
    ping --silent; then
    break
  fi

  if ! kill -0 "$mysql_pid" 2>/dev/null; then
    wait "$mysql_pid"
    exit $?
  fi

  attempt=$((attempt + 1))
  sleep 1
done

if [ "$attempt" -eq 60 ]; then
  echo "MySQL did not become ready for application-user reconciliation." >&2
  kill -TERM "$mysql_pid" 2>/dev/null || true
  wait "$mysql_pid" 2>/dev/null || true
  exit 1
fi

sql_literal() {
  printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e "s/'/''/g"
}

mysql_user="$(sql_literal "$MYSQL_USER")"
mysql_password="$(sql_literal "$MYSQL_PASSWORD")"

MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql \
  --protocol=socket \
  --socket=/var/run/mysqld/mysqld.sock \
  --user=root \
  --execute "
    CREATE DATABASE IF NOT EXISTS \`$MYSQL_DATABASE\`
      CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    CREATE USER IF NOT EXISTS '$mysql_user'@'%' IDENTIFIED BY '$mysql_password';
    ALTER USER '$mysql_user'@'%' IDENTIFIED BY '$mysql_password';
    GRANT ALL PRIVILEGES ON \`$MYSQL_DATABASE\`.* TO '$mysql_user'@'%';
    FLUSH PRIVILEGES;
  "

touch "$marker_file"
echo "MySQL application user reconciled."

wait "$mysql_pid"
