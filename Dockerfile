FROM nginx:1.27-alpine
RUN apk add --no-cache apache2-utils
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY 40-auth.sh /docker-entrypoint.d/40-auth.sh
RUN chmod 0755 /docker-entrypoint.d/40-auth.sh
COPY index.html /usr/share/nginx/html/index.html
COPY data.json.gz advanced.json /usr/share/nginx/html/
EXPOSE 8080
