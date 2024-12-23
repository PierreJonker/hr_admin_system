#!/bin/bash

# T3 Stack Project Setup Script
# Author: [Your Name]
# Date: [Today's Date]

echo "Starting the project setup..."

# Step 1: Check for Node.js and npm
if ! command -v node &> /dev/null || ! command -v npm &> /dev/null
then
    echo "Node.js or npm is not installed. Please install them first."
    exit 1
fi

# Step 2: Check for .env file
if [ ! -f .env ]; then
  echo ".env file not found. Creating one with sample values..."
  cat > .env <<EOL
# Environment Variables for T3 Stack
AUTH_SECRET="p/wrSvsfu1HMIrQYnwab0F9LMborjQqSyGbq3+X/yv8="
DATABASE_URL="file:./db.sqlite"
EOL
  echo ".env file created with sample values. Update it as needed."
else
  echo ".env file already exists. Skipping creation."
fi

# Step 3: Install dependencies
echo "Installing dependencies..."
npm install

# Step 4: Generate Prisma Client
echo "Generating Prisma client..."
npx prisma generate

# Step 5: Run database migrations
echo "Running database migrations..."
npx prisma migrate dev

# Step 6: Seed the database (optional)
if [ -f prisma/seed.ts ]; then
  echo "Seeding the database..."
  npx tsx prisma/seed.ts
else
  echo "No seed file found. Skipping database seeding."
fi

# Step 7: Start the development server
echo "Starting the development server..."
npm run dev

echo "Setup complete. The server is running at http://localhost:3000."
