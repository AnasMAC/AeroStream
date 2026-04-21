# Use the official Node.js Alpine image for a minimal footprint
FROM node:20-alpine

# Install ffmpeg as the root user BEFORE switching users
RUN apk add --no-cache ffmpeg

# Set the working directory inside the container
WORKDIR /app

# Copy package.json first, making the 'node' user the owner
COPY --chown=node:node package*.json ./

# Install only production dependencies
RUN npm install --omit=dev

# Copy the rest of the application files, making the 'node' user the owner
COPY --chown=node:node . .

# Switch to a non-root user for better security
USER node

# Expose the port
EXPOSE 3000

# Start the application
CMD ["node", "app.js"]