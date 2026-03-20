/**
 * HTTP type augmentations for the custom Fubelt v4 framework.
 *
 * The server (utils/server/server.js) adds the following properties to the
 * native Node.js IncomingMessage and ServerResponse objects at request time:
 *
 *   req.query    - parsed query-string (object of string | string[])
 *   req.path     - pathname component of the URL (string)
 *   req.hostname - sanitised hostname from the Host header (string)
 *   req.ip       - sanitised remote IP address (string)
 *   req.params   - route parameter bag (e.g. { id: "42" }) (object)
 *   req.body     - parsed JSON body (unknown) or null when parsing fails
 *   req.uploadedFiles - files written by the secure-upload middleware
 *
 *   res.status(code)     - set statusCode, returns res (for chaining)
 *   res.json(data)       - write JSON response
 *   res.send(data)       - write text or JSON response
 *   res.set(key, value)  - alias for res.setHeader, returns res
 *
 * These interfaces are used by middleware that must type-check against the
 * augmented objects without relying on `any`.
 */

import type { IncomingMessage, ServerResponse } from 'http';
import type { UploadedFile } from '../core/middleware/upload';

export interface AppRequest extends IncomingMessage {
  /** Parsed query-string parameters */
  query: Record<string, string | string[]>;
  /** Pathname component of the URL */
  path: string;
  /** Sanitised hostname from the Host header */
  hostname: string;
  /** Sanitised remote IP address */
  ip: string;
  /** Route parameters extracted from the URL pattern */
  params: Record<string, string>;
  /** Parsed JSON request body (null when parsing fails, undefined before parsing) */
  body: unknown;
  /** Files uploaded via the secure-upload middleware */
  uploadedFiles?: UploadedFile[];
}

export interface AppResponse extends ServerResponse {
  /** Set the HTTP status code and return this response for chaining */
  status(code: number): this;
  /** Send a JSON-serialised response */
  json(data: unknown): void;
  /** Send a text/plain or JSON response depending on the value type */
  send(data: unknown): void;
  /** Alias for setHeader; returns this response for chaining */
  set(key: string, value: string | number | readonly string[]): this;
}

/** Middleware next-function signature used by the Fubelt framework */
export type NextFunction = () => void;
