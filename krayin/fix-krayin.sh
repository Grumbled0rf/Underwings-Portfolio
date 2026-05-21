#!/bin/bash
# Fixes Krayin settings that get overwritten by entrypoint
sleep 15
docker exec underwings-krayin bash -c "cd /var/www/laravel-crm && \
  sed -i 's|MAIL_HOST=.*|MAIL_HOST=stalwart|' .env && \
  sed -i 's|MAIL_PORT=.*|MAIL_PORT=587|' .env && \
  sed -i 's|MAIL_USERNAME=.*|MAIL_USERNAME=noreply|' .env && \
  sed -i 's|MAIL_PASSWORD=.*|MAIL_PASSWORD=Noreply@1415!|' .env && \
  sed -i 's|MAIL_FROM_ADDRESS=.*|MAIL_FROM_ADDRESS=crm@underwings.org|' .env && \
  sed -i 's|MAIL_FROM_NAME=.*|MAIL_FROM_NAME=\"Underwings CRM\"|' .env && \
  sed -i 's|APP_TIMEZONE=.*|APP_TIMEZONE=Asia/Dubai|' .env && \
  grep -q WEBHOOK_TOKEN .env || echo 'WEBHOOK_TOKEN=97943baa0cae0e44286e4d6fb7af0e9e838d5952f3e2f175' >> .env && \
  grep -q webhook /etc/nginx/conf.d/krayin.conf || sed -i '/location ~ ^\/index\\\\.php/i\\
    location = /webhook-contact.php {\\
        fastcgi_pass unix:/run/php/php-fpm.sock;\\
        fastcgi_param SCRIPT_FILENAME \$realpath_root\$fastcgi_script_name;\\
        include fastcgi_params;\\
    }' /etc/nginx/conf.d/krayin.conf && \
  nginx -s reload && \
  rm -rf storage/framework/views/* && php artisan config:clear && php artisan view:clear && \
  supervisorctl restart php-fpm" 2>/dev/null
