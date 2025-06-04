FROM traefik:3.4

# Copy Traefik configuration files
COPY docker/traefik/traefik.yml /etc/traefik/traefik.yml
COPY docker/traefik/dynamic.yml /etc/traefik/dynamic.yml

# Expose ports
EXPOSE 80 8080

# Use the default traefik entrypoint
CMD ["traefik"]
