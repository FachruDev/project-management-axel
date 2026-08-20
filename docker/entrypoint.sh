#!/usr/bin/env sh
set -eu

role="${CONTAINER_ROLE:-app}"

run_as_www_data() {
    if [ "$(id -u)" = "0" ]; then
        gosu www-data "$@"
    else
        "$@"
    fi
}

artisan() {
    run_as_www_data php artisan "$@"
}

prepare_writable_paths() {
    mkdir -p \
        storage/app/public \
        storage/framework/cache/data \
        storage/framework/sessions \
        storage/framework/views \
        storage/logs \
        bootstrap/cache

    if [ "$(id -u)" = "0" ]; then
        chown -R www-data:www-data storage bootstrap/cache
        chmod -R ug+rwX storage bootstrap/cache
    fi
}

wait_for_database() {
    if [ "${APP_WAIT_FOR_DB:-true}" != "true" ]; then
        return
    fi

    case "${DB_CONNECTION:-}" in
        pgsql|mysql|mariadb|sqlsrv) ;;
        *) return ;;
    esac

    echo "Waiting for database ${DB_HOST:-127.0.0.1}:${DB_PORT:-5432}..."

    until php -r '
        $host = getenv("DB_HOST") ?: "127.0.0.1";
        $port = (int) (getenv("DB_PORT") ?: (getenv("DB_CONNECTION") === "pgsql" ? 5432 : 3306));
        $socket = @fsockopen($host, $port, $errno, $errstr, 2);
        if ($socket === false) {
            exit(1);
        }
        fclose($socket);
    '; do
        sleep 2
    done
}

wait_for_migrations() {
    if [ "${APP_WAIT_FOR_MIGRATIONS:-false}" != "true" ]; then
        return
    fi

    echo "Waiting for Laravel migrations..."

    until artisan migrate:status --no-interaction >/dev/null 2>&1; do
        sleep 2
    done
}

clear_bootstrap_cache() {
    artisan config:clear --no-interaction >/dev/null
    artisan route:clear --no-interaction >/dev/null
    artisan view:clear --no-interaction >/dev/null
    artisan event:clear --no-interaction >/dev/null
}

prepare_laravel() {
    artisan storage:link --force >/dev/null 2>&1 || true

    if [ "$role" = "app" ]; then
        clear_bootstrap_cache

        if [ "${APP_AUTO_MIGRATE:-false}" = "true" ]; then
            artisan migrate --force --no-interaction
        fi

        if [ "${APP_AUTO_SEED:-false}" = "true" ]; then
            artisan db:seed --force --no-interaction
        fi

        if [ "${APP_ENV:-production}" = "production" ]; then
            artisan optimize --no-interaction
        fi
    elif [ "${APP_PREPARE_CACHE_ON_START:-false}" = "true" ]; then
        if [ "${APP_ENV:-production}" = "production" ]; then
            artisan optimize --no-interaction
        else
            artisan optimize:clear --no-interaction >/dev/null
        fi
    fi
}

if [ "${1#-}" != "$1" ]; then
    set -- php-fpm "$@"
fi

prepare_writable_paths
wait_for_database
wait_for_migrations
prepare_laravel

if [ "$1" = "php-fpm" ]; then
    exec docker-php-entrypoint "$@"
fi

if [ "$(id -u)" = "0" ]; then
    exec gosu www-data "$@"
fi

exec "$@"
