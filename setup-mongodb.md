# MongoDB Setup Guide

## Option 1: Use MongoDB Atlas (Cloud) - Already Configured
Your app is currently configured to use MongoDB Atlas. This should work out of the box.

## Option 2: Local MongoDB Installation (Recommended for Development)

### Windows Installation:

1. **Download MongoDB Community Server:**
   - Go to: https://www.mongodb.com/try/download/community
   - Select Windows x64 
   - Download and run the installer

2. **Install MongoDB:**
   - Run the installer as Administrator
   - Choose "Complete" installation
   - Install MongoDB as a Service (recommended)
   - Install MongoDB Compass (GUI tool)

3. **Start MongoDB Service:**
   ```powershell
   net start MongoDB
   ```

4. **Update your .env file to use local MongoDB:**
   ```
   MONGO_URI=mongodb://localhost:27017/connect-db
   ```

### Verify Installation:

1. **Open Command Prompt and run:**
   ```bash
   mongo --version
   ```

2. **Connect to MongoDB:**
   ```bash
   mongo
   ```

3. **Create your database:**
   ```javascript
   use connect-db
   db.users.insertOne({test: "connection successful"})
   ```

## Option 3: MongoDB with Docker (Alternative)

If you have Docker installed:

```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

Then update your .env:
```
MONGO_URI=mongodb://localhost:27017/connect-db
```

## Troubleshooting:

1. **Connection Issues:**
   - Ensure MongoDB service is running
   - Check if port 27017 is available
   - Verify your connection string

2. **Atlas Connection Issues:**
   - Check your network connection
   - Verify the connection string
   - Ensure your IP is whitelisted in Atlas

3. **Authentication Errors:**
   - Verify your MongoDB Atlas credentials
   - Check if your cluster is active
