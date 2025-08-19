# Use the official Node.js image as the base image
FROM node:20.11

# Create and set the working directory for the application
WORKDIR /app

# Copy package.json and package-lock.json (or yarn.lock) to the container
COPY package*.json ./

# Install application dependencies
RUN yarn install

# Copy the rest of the application source code
COPY . .

# Build the TypeScript code
RUN yarn build

# Expose the port the app runs on
EXPOSE 9000

# Specify the command to run the application
CMD ["yarn", "start"]
 