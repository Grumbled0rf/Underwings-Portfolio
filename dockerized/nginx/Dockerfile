# ===========================================
# NGINX DOCKERFILE
# ===========================================

FROM nginx:1.27-alpine

# Remove default config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom config and error pages
COPY nginx.conf /etc/nginx/nginx.conf
COPY maintenance.html /usr/share/nginx/html/maintenance.html

# Create SSL directory
RUN mkdir -p /etc/nginx/ssl

# Create certbot webroot
RUN mkdir -p /var/www/certbot

# Expose ports
EXPOSE 80 443

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://0.0.0.0:80/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
