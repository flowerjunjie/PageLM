/**
 * Secure File Upload Middleware
 * Provides secure file upload functionality with proper validation and sanitization
 */

import fs from 'fs';
import path from 'path';
import Busboy from 'busboy';
import crypto from 'crypto';
import type { AppRequest, AppResponse, NextFunction } from '../../types/http';

export interface UploadedFile {
  path: string;
  filename: string;
  mimeType: string;
  size: number;
  hash: string;
}

export interface UploadConfig {
  maxFileSize?: number;          // Default: 10MB
  maxFiles?: number;             // Default: 5
  allowedMimeTypes?: string[];   // Default: common document types
  uploadDir?: string;            // Default: storage/uploads
  sanitizeFilename?: boolean;    // Default: true
  virusScan?: boolean;           // Default: false (requires clamav)
}

// Default allowed MIME types for document uploads
const DEFAULT_ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.oasis.opendocument.text',
  'text/plain',
  'text/markdown',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];

// Dangerous file extensions to block
const DANGEROUS_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.scr', '.pif', '.com', '.js', '.vbs', '.jar',
  '.sh', '.bash', '.ps1', '.php', '.asp', '.aspx', '.jsp', '.py', '.rb',
];

/**
 * Sanitize filename to prevent path traversal and other attacks
 */
function sanitizeFilename(filename: string): string {
  // Remove path information
  const name = path.basename(filename);

  // Remove null bytes and control characters
  let sanitized = name.replace(/[\x00-\x1F\x7F]/g, '');

  // Replace dangerous characters with underscore
  sanitized = sanitized.replace(/[<>:"|?*\x00-\x1F]/g, '_');

  // Limit length
  if (sanitized.length > 255) {
    const ext = path.extname(sanitized);
    const nameWithoutExt = path.basename(sanitized, ext).substring(0, 255 - ext.length);
    sanitized = nameWithoutExt + ext;
  }

  // Check for dangerous extensions
  const ext = path.extname(sanitized).toLowerCase();
  if (DANGEROUS_EXTENSIONS.includes(ext)) {
    throw new Error(`Dangerous file extension: ${ext}`);
  }

  return sanitized;
}

/**
 * Calculate file hash for integrity verification
 */
function calculateFileHash(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);

    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

/**
 * Validate MIME type by checking file signature
 */
function validateMimeType(filePath: string, declaredMimeType: string): boolean {
  const buffer = Buffer.alloc(12);
  const fd = fs.openSync(filePath, 'r');
  fs.readSync(fd, buffer, 0, 12, 0);
  fs.closeSync(fd);

  // Check file signatures
  const signatures: Record<string, string> = {
    'image/png': '89504E470D0A1A0A',
    'image/jpeg': 'FFD8FF',
    'image/gif': '47494638',
    'application/pdf': '25504446',
    'application/zip': '504B0304',
  };

  const declaredSignature = signatures[declaredMimeType];
  if (!declaredSignature) return true; // Skip validation if signature not defined

  const fileSignature = buffer.subarray(0, declaredSignature.length / 2)
    .toString('hex')
    .toUpperCase();

  return fileSignature === declaredSignature;
}

/**
 * Create secure upload middleware
 */
export function createSecureUpload(config: UploadConfig = {}) {
  const {
    maxFileSize = 10 * 1024 * 1024, // 10MB
    maxFiles = 5,
    allowedMimeTypes = DEFAULT_ALLOWED_MIME_TYPES,
    uploadDir = path.join(process.cwd(), 'storage', 'uploads'),
    sanitizeFilename: shouldSanitizeFilename = true,
  } = config;

  // Ensure upload directory exists
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true, mode: 0o750 });
  }

  return (req: AppRequest, res: AppResponse, next: NextFunction): void => {
    if (!req.headers['content-type']?.includes('multipart/form-data')) {
      return next();
    }

    const busboy = Busboy({
      headers: req.headers as Record<string, string>,
      limits: {
        fileSize: maxFileSize,
        files: maxFiles,
      },
    });

    const files: UploadedFile[] = [];
    const fields: Record<string, string> = {};
    let fileCount = 0;

    busboy.on('field', (fieldname: string, value: string) => {
      fields[fieldname] = value;
    });

    busboy.on('file', async (fieldname: string, file: NodeJS.ReadableStream, info: { filename: string; encoding: string; mimeType: string }) => {
      fileCount++;

      if (fileCount > maxFiles) {
        (file as NodeJS.ReadableStream & { resume(): void }).resume();
        return;
      }

      const originalFilename = info.filename;
      const mimeType = info.mimeType || 'application/octet-stream';

      try {
        // Validate MIME type
        if (!allowedMimeTypes.includes(mimeType)) {
          (file as NodeJS.ReadableStream & { resume(): void }).resume();
          throw new Error(`MIME type not allowed: ${mimeType}`);
        }

        // Sanitize filename
        const filename = shouldSanitizeFilename
          ? sanitizeFilename(originalFilename)
          : originalFilename;

        // Generate unique filename with timestamp
        const uniqueFilename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}-${filename}`;
        const filePath = path.join(uploadDir, uniqueFilename);

        // Write file with restricted permissions
        const writeStream = fs.createWriteStream(filePath, { mode: 0o640 });

        let fileSize = 0;
        let sizeLimitReached = false;
        file.on('data', (chunk: Buffer) => {
          if (sizeLimitReached) return;
          fileSize += chunk.length;
          if (fileSize > maxFileSize) {
            sizeLimitReached = true;
            writeStream.destroy();
            fs.unlinkSync(filePath);
            (file as NodeJS.ReadableStream & { resume(): void }).resume();
            // Don't throw in callback - let the stream error handler deal with it
          }
        });

        file.on('error', (error: Error) => {
          if (error.message.includes('File size exceeds limit')) {
            console.error('File rejected: exceeds size limit');
          }
          (file as NodeJS.ReadableStream & { resume(): void }).resume();
        });

        writeStream.on('error', (error: Error) => {
          (file as NodeJS.ReadableStream & { resume(): void }).resume();
          console.error('File write error:', error);
        });

        file.pipe(writeStream as NodeJS.WritableStream);

        writeStream.on('finish', async () => {
          try {
            // Validate MIME type by file signature
            if (!validateMimeType(filePath, mimeType)) {
              fs.unlinkSync(filePath);
              throw new Error('MIME type validation failed');
            }

            // Calculate file hash
            const hash = await calculateFileHash(filePath);

            files.push({
              path: filePath,
              filename,
              mimeType,
              size: fileSize,
              hash,
            });
          } catch (error: unknown) {
            console.error('File validation error:', error);
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
            }
          }
        });
      } catch (error: unknown) {
        console.error('File upload error:', error);
        (file as NodeJS.ReadableStream & { resume(): void }).resume();
      }
    });

    busboy.on('finish', () => {
      req.uploadedFiles = files;
      req.body = { ...(fields as Record<string, unknown>), ...(req.body as Record<string, unknown> | null ?? {}) };
      next();
    });

    busboy.on('error', (error: Error) => {
      console.error('Busboy error:', error);
      // Clean up any uploaded files
      files.forEach((file) => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
      res.status(400).json({
        error: 'File Upload Error',
        message: error.message,
      });
    });

    req.pipe(busboy as unknown as NodeJS.WritableStream);
  };
}

/**
 * Cleanup old uploaded files
 */
export function cleanupOldUploads(uploadDir: string, maxAge: number = 24 * 60 * 60 * 1000): void {
  const now = Date.now();

  if (!fs.existsSync(uploadDir)) return;

  const fileList = fs.readdirSync(uploadDir);

  for (const file of fileList) {
    const filePath = path.join(uploadDir, file);
    const stats = fs.statSync(filePath);

    if (stats.isFile() && now - stats.mtimeMs > maxAge) {
      try {
        fs.unlinkSync(filePath);
        console.log(`Cleaned up old upload: ${file}`);
      } catch (error) {
        console.error(`Failed to cleanup file ${file}:`, error);
      }
    }
  }
}

// Schedule cleanup every hour
if (require.main === module) {
  setInterval(() => {
    const dir = path.join(process.cwd(), 'storage', 'uploads');
    cleanupOldUploads(dir);
  }, 60 * 60 * 1000);
}
