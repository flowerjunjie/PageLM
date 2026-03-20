/**
 * File System Mock for Backend Tests
 * Provides mock implementations for file system operations
 */

import { vi } from 'vitest'
import { EventEmitter } from 'events'

// In-memory file storage
const mockFiles = new Map<string, Buffer>()
const mockDirectories = new Set<string>()

/**
 * Reset the mock file system
 */
export function resetMockFileSystem(): void {
  mockFiles.clear()
  mockDirectories.clear()
}

/**
 * Add a mock file to the file system
 */
export function addMockFile(path: string, content: Buffer | string): void {
  mockFiles.set(path, Buffer.isBuffer(content) ? content : Buffer.from(content))
}

/**
 * Add a mock directory to the file system
 */
export function addMockDirectory(path: string): void {
  mockDirectories.add(path)
}

/**
 * Mock fs module
 */
export const mockFs = {
  existsSync: vi.fn((path: string): boolean => {
    return mockFiles.has(path) || mockDirectories.has(path)
  }),

  readFileSync: vi.fn((path: string, encoding?: string): Buffer | string => {
    const content = mockFiles.get(path)
    if (!content) {
      throw new Error(`ENOENT: no such file or directory, open '${path}'`)
    }
    return encoding ? content.toString(encoding as BufferEncoding) : content
  }),

  writeFileSync: vi.fn((path: string, data: Buffer | string): void => {
    mockFiles.set(path, Buffer.isBuffer(data) ? data : Buffer.from(data))
  }),

  mkdirSync: vi.fn((path: string, options?: { recursive?: boolean }): void => {
    mockDirectories.add(path)
    if (options?.recursive) {
      // Add parent directories
      const parts = path.split('/')
      let currentPath = ''
      for (const part of parts) {
        currentPath += part + '/'
        mockDirectories.add(currentPath.slice(0, -1))
      }
    }
  }),

  readdirSync: vi.fn((path: string): string[] => {
    const entries: string[] = []
    for (const filePath of mockFiles.keys()) {
      if (filePath.startsWith(path + '/') || filePath.startsWith(path + '\\')) {
        const relativePath = filePath.slice(path.length + 1)
        const firstPart = relativePath.split(/[\\/]/)[0]
        if (firstPart && !entries.includes(firstPart)) {
          entries.push(firstPart)
        }
      }
    }
    return entries
  }),

  statSync: vi.fn((path: string): any => {
    const isFile = mockFiles.has(path)
    const isDirectory = mockDirectories.has(path)

    if (!isFile && !isDirectory) {
      throw new Error(`ENOENT: no such file or directory, stat '${path}'`)
    }

    return {
      isFile: () => isFile,
      isDirectory: () => isDirectory,
      size: isFile ? mockFiles.get(path)!.length : 0,
      mtime: new Date(),
      ctime: new Date(),
      birthtime: new Date(),
    }
  }),

  unlinkSync: vi.fn((path: string): void => {
    mockFiles.delete(path)
  }),

  rmdirSync: vi.fn((path: string): void => {
    mockDirectories.delete(path)
  }),

  rmSync: vi.fn((path: string, options?: { recursive?: boolean }): void => {
    if (options?.recursive) {
      // Remove all files and directories under this path
      for (const filePath of mockFiles.keys()) {
        if (filePath.startsWith(path)) {
          mockFiles.delete(filePath)
        }
      }
      for (const dirPath of mockDirectories) {
        if (dirPath.startsWith(path)) {
          mockDirectories.delete(dirPath)
        }
      }
    }
    mockFiles.delete(path)
    mockDirectories.delete(path)
  }),

  copyFileSync: vi.fn((src: string, dest: string): void => {
    const content = mockFiles.get(src)
    if (!content) {
      throw new Error(`ENOENT: no such file or directory, copy '${src}'`)
    }
    mockFiles.set(dest, Buffer.from(content))
  }),

  renameSync: vi.fn((oldPath: string, newPath: string): void => {
    const content = mockFiles.get(oldPath)
    if (!content) {
      throw new Error(`ENOENT: no such file or directory, rename '${oldPath}'`)
    }
    mockFiles.set(newPath, content)
    mockFiles.delete(oldPath)
  }),
}

/**
 * Mock fs.promises module
 */
export const mockFsPromises = {
  readFile: vi.fn(async (path: string, encoding?: string): Promise<Buffer | string> => {
    return mockFs.readFileSync(path, encoding)
  }),

  writeFile: vi.fn(async (path: string, data: Buffer | string): Promise<void> => {
    mockFs.writeFileSync(path, data)
  }),

  mkdir: vi.fn(async (path: string, options?: { recursive?: boolean }): Promise<void> => {
    mockFs.mkdirSync(path, options)
  }),

  readdir: vi.fn(async (path: string): Promise<string[]> => {
    return mockFs.readdirSync(path)
  }),

  stat: vi.fn(async (path: string): Promise<any> => {
    return mockFs.statSync(path)
  }),

  unlink: vi.fn(async (path: string): Promise<void> => {
    mockFs.unlinkSync(path)
  }),

  rm: vi.fn(async (path: string, options?: { recursive?: boolean }): Promise<void> => {
    mockFs.rmSync(path, options)
  }),

  access: vi.fn(async (path: string): Promise<void> => {
    if (!mockFiles.has(path) && !mockDirectories.has(path)) {
      throw new Error(`ENOENT: no such file or directory, access '${path}'`)
    }
  }),
}

/**
 * Mock createReadStream
 */
export function createMockReadStream(content: Buffer | string): EventEmitter {
  const stream = new EventEmitter()
  const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content)

  // Simulate async stream behavior
  setImmediate(() => {
    stream.emit('data', buffer)
    stream.emit('end')
  })

  return stream
}

/**
 * Mock createWriteStream
 */
export function createMockWriteStream(path: string): EventEmitter {
  const stream = new EventEmitter()
  let content = Buffer.alloc(0)

  stream.write = vi.fn((chunk: Buffer | string): boolean => {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    content = Buffer.concat([content, buffer])
    return true
  })

  stream.end = vi.fn((chunk?: Buffer | string): void => {
    if (chunk) {
      stream.write(chunk)
    }
    mockFiles.set(path, content)
    setImmediate(() => stream.emit('finish'))
  })

  return stream
}

/**
 * Mock path module utilities
 */
export const mockPath = {
  resolve: vi.fn((...paths: string[]): string => {
    return paths.join('/').replace(/\/+/g, '/')
  }),

  join: vi.fn((...paths: string[]): string => {
    return paths.join('/').replace(/\/+/g, '/')
  }),

  dirname: vi.fn((path: string): string => {
    const parts = path.split('/')
    parts.pop()
    return parts.join('/') || '/'
  }),

  basename: vi.fn((path: string, ext?: string): string => {
    const parts = path.split('/')
    let name = parts[parts.length - 1] || ''
    if (ext && name.endsWith(ext)) {
      name = name.slice(0, -ext.length)
    }
    return name
  }),

  extname: vi.fn((path: string): string => {
    const basename = path.split('/').pop() || ''
    const dotIndex = basename.lastIndexOf('.')
    return dotIndex > 0 ? basename.slice(dotIndex) : ''
  }),

  normalize: vi.fn((path: string): string => {
    return path.replace(/\/+/g, '/').replace(/\/\.\//g, '/').replace(/\/[^/]+\/\.\./g, '')
  }),
}

/**
 * Factory for creating mock file uploads
 */
export function createMockFileUpload(overrides: Partial<any> = {}): any {
  return {
    fieldname: 'file',
    originalname: 'test-file.pdf',
    encoding: '7bit',
    mimetype: 'application/pdf',
    size: 1024,
    buffer: Buffer.from('mock file content'),
    path: '/tmp/test-file.pdf',
    ...overrides,
  }
}

/**
 * Factory for creating mock multipart form data
 */
export function createMockMultipartData(fields: { [key: string]: string }, files: any[] = []): Buffer {
  const boundary = '----TestBoundary' + Date.now()
  let data = ''

  for (const [key, value] of Object.entries(fields)) {
    data += `--${boundary}\r\n`
    data += `Content-Disposition: form-data; name="${key}"\r\n\r\n`
    data += `${value}\r\n`
  }

  for (const file of files) {
    data += `--${boundary}\r\n`
    data += `Content-Disposition: form-data; name="${file.fieldname}"; filename="${file.originalname}"\r\n`
    data += `Content-Type: ${file.mimetype}\r\n\r\n`
    data += file.buffer.toString()
    data += '\r\n'
  }

  data += `--${boundary}--\r\n`

  return Buffer.from(data)
}

export default mockFs
