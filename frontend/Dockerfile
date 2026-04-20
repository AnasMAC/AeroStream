# Use the official Nginx image as a base
FROM nginx:latest

# Remove the default Nginx configuration file
RUN rm /etc/nginx/conf.d/default.conf

# Copy your custom configuration file into the container
COPY nginx.conf /etc/nginx/conf.d/

# Copy your website files into the default Nginx public directory
COPY ./pages /usr/share/nginx/html

# Nginx exposes port 80 by default, so no EXPOSE directive is strictly needed, but it's good practice
EXPOSE 80