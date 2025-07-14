#!/usr/bin/env node
const { exec } = require('child_process');
const fs = require('fs');

const databaseUrl = process.env.DATABASE_URL;
const backupName = `backup-${new Date().toISOString().split('T')[0]}.sql`;

exec(`pg_dump ${databaseUrl} > ${backupName}`, (error) => {
  if (error) {
    console.error('Backup failed:', error);
    process.exit(1);
  }
  console.log(`Backup created: ${backupName}`);
  // Upload to S3 or other storage here
});