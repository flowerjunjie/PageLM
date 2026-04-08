import Keyv from 'keyv'
import SQLite from '@keyv/sqlite'
import fs from 'fs'
import path from 'path'

// Ensure storage directory exists before initializing database
const storageDir = path.join(process.cwd(), 'storage')
const dbPath = path.join(storageDir, 'database.sqlite')

try {
  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true, mode: 0o700 })
    console.log('[keyv] Created storage directory:', storageDir)
  }
} catch (err) {
  console.error('[keyv] Failed to create storage directory:', err)
}

const db = new Keyv({
  store: new SQLite({ uri: `sqlite://${dbPath}` })
})

export default db