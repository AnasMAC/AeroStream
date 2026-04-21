# Use the official Node.js Alpine image for a minimal footprint
FROM node:20-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json first
# This leverages Docker's layer caching so you don't reinstall npm packages every time you change app.js
COPY package*.json ./

# Install only production dependencies
RUN npm install --omit=dev

# Copy the rest of the application files
COPY . .

# Switch to a non-root user for better security
USER node

# Expose the port (Assume 3000 if not specified)
EXPOSE 3000

# Start the application
CMD ["node", "app.js"]