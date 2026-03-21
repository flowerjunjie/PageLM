/**
 * HTTP/Express Mock for Backend Tests
 * Provides mock implementations for Express.js request/response objects
 */

import { vi } from 'vitest'
import { EventEmitter } from 'events'

/**
 * Mock Express Request object
 */
export function mockRequest(overrides: Partial<any> = {}): any {
  const req = {
    // Core properties
    body: {},
    params: {},
    query: {},
    headers: {},
    cookies: {},
    signedCookies: {},
    session: {},
    files: undefined,
    file: undefined,

    // Request info
    method: 'GET',
    url: '/',
    originalUrl: '/',
    baseUrl: '',
    path: '/',
    hostname: 'localhost',
    ip: '127.0.0.1',
    protocol: 'http',
    secure: false,
    xhr: false,

    // Methods
    get: vi.fn(function(this: any, header: string): string | undefined {
      return this.headers[header.toLowerCase()]
    }),

    header: vi.fn(function(this: any, header: string): string | undefined {
      return this.headers[header.toLowerCase()]
    }),

    accepts: vi.fn((...types: string[]) => {
      return types[0] || false
    }),

    acceptsCharsets: vi.fn(() => true),

    acceptsEncodings: vi.fn(() => true),

    acceptsLanguages: vi.fn(() => true),

    is: vi.fn((type: string) => {
      return false
    }),

    param: vi.fn(function(this: any, name: string): string | undefined {
      return this.params[name] || this.query[name] || this.body[name]
    }),

    queryParam: vi.fn(function(this: any, name: string): string | undefined {
      return this.query[name]
    }),

    // User/auth info
    user: undefined,
    auth: undefined,

    // Custom properties
    requestId: `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,

    ...overrides,
  }

  return req
}

/**
 * Mock Express Response object
 */
export function mockResponse(overrides: Partial<any> = {}): any {
  const res: any = new EventEmitter()

  // Status tracking
  res.statusCode = 200
  res.headersSent = false
  res.locals = {}

  // Response data tracking
  res._json = undefined
  res._send = undefined
  res._render = undefined
  res._redirect = undefined
  res._headers = {} as { [key: string]: string }
  res._cookies = {} as { [key: string]: any }

  // Methods
  res.status = vi.fn((code: number) => {
    res.statusCode = code
    return res
  })

  res.json = vi.fn((data: any) => {
    res._json = data
    res.headersSent = true
    res.emit('json', data)
    return res
  })

  res.send = vi.fn((data: any) => {
    res._send = data
    res.headersSent = true
    res.emit('send', data)
    return res
  })

  res.sendStatus = vi.fn((code: number) => {
    res.statusCode = code
    res.headersSent = true
    return res
  })

  res.jsonp = vi.fn((data: any) => {
    res._json = data
    res.headersSent = true
    return res
  })

  res.render = vi.fn((view: string, locals?: any) => {
    res._render = { view, locals }
    res.headersSent = true
    res.emit('render', view, locals)
    return res
  })

  res.redirect = vi.fn((status: number | string, url?: string) => {
    if (typeof status === 'string') {
      res._redirect = { status: 302, url: status }
    } else {
      res._redirect = { status, url }
    }
    res.headersSent = true
    res.emit('redirect', res._redirect)
    return res
  })

  res.set = vi.fn((field: string | { [key: string]: string }, value?: string) => {
    if (typeof field === 'object') {
      Object.assign(res._headers, field)
    } else if (value !== undefined) {
      res._headers[field.toLowerCase()] = value
    }
    return res
  })

  res.setHeader = vi.fn((field: string, value: string) => {
    res._headers[field.toLowerCase()] = value
    return res
  })

  res.getHeader = vi.fn((field: string): string | undefined => {
    return res._headers[field.toLowerCase()]
  })

  res.removeHeader = vi.fn((field: string) => {
    delete res._headers[field.toLowerCase()]
    return res
  })

  res.get = vi.fn((field: string): string | undefined => {
    return res._headers[field.toLowerCase()]
  })

  res.header = res.set

  res.type = vi.fn((type: string) => {
    res._headers['content-type'] = type
    return res
  })

  res.format = vi.fn((obj: { [key: string]: () => void }) => {
    if (obj.json) obj.json()
    return res
  })

  res.cookie = vi.fn((name: string, value: any, options?: any) => {
    res._cookies[name] = { value, options }
    return res
  })

  res.clearCookie = vi.fn((name: string, options?: any) => {
    delete res._cookies[name]
    return res
  })

  res.attachment = vi.fn((filename?: string) => {
    res._headers['content-disposition'] = filename
      ? `attachment; filename="${filename}"`
      : 'attachment'
    return res
  })

  res.download = vi.fn((path: string, filename?: string, fn?: Function) => {
    res._headers['content-disposition'] = `attachment; filename="${filename || path}"`
    res.headersSent = true
    return res
  })

  res.end = vi.fn((data?: any) => {
    res.headersSent = true
    res.emit('end', data)
    return res
  })

  res.links = vi.fn((links: { [key: string]: string }) => {
    const linkHeader = Object.entries(links)
      .map(([rel, url]) => `<${url}>; rel="${rel}"`)
      .join(', ')
    res._headers['link'] = linkHeader
    return res
  })

  res.location = vi.fn((url: string) => {
    res._headers['location'] = url
    return res
  })

  res.vary = vi.fn((field: string) => {
    const current = res._headers['vary'] || ''
    res._headers['vary'] = current ? `${current}, ${field}` : field
    return res
  })

  // Apply overrides
  Object.assign(res, overrides)

  return res
}

/**
 * Mock Express Next function
 */
export function mockNextFunction(): any {
  return vi.fn((err?: any) => {
    if (err) {
      throw err
    }
  })
}

/**
 * Mock Express application
 */
export function createMockExpressApp(): any {
  const app: any = new EventEmitter()

  // Middleware stack
  app._router = {
    stack: [],
  }

  // Route handlers
  app._routes = {} as { [key: string]: any }
  app._wsHandlers = {} as { [key: string]: any }

  // Core methods
  app.use = vi.fn((path: string | Function, ...handlers: Function[]) => {
    if (typeof path === 'function') {
      handlers.unshift(path)
      path = '/'
    }
    app._router.stack.push({ path, handlers })
    return app
  })

  app.get = vi.fn((path: string, ...handlers: Function[]) => {
    app._routes[`GET ${path}`] = handlers
    return app
  })

  app.post = vi.fn((path: string, ...handlers: Function[]) => {
    app._routes[`POST ${path}`] = handlers
    return app
  })

  app.put = vi.fn((path: string, ...handlers: Function[]) => {
    app._routes[`PUT ${path}`] = handlers
    return app
  })

  app.patch = vi.fn((path: string, ...handlers: Function[]) => {
    app._routes[`PATCH ${path}`] = handlers
    return app
  })

  app.delete = vi.fn((path: string, ...handlers: Function[]) => {
    app._routes[`DELETE ${path}`] = handlers
    return app
  })

  app.options = vi.fn((path: string, ...handlers: Function[]) => {
    app._routes[`OPTIONS ${path}`] = handlers
    return app
  })

  app.head = vi.fn((path: string, ...handlers: Function[]) => {
    app._routes[`HEAD ${path}`] = handlers
    return app
  })

  app.all = vi.fn((path: string, ...handlers: Function[]) => {
    app._routes[`ALL ${path}`] = handlers
    return app
  })

  app.ws = vi.fn((path: string, handler: Function) => {
    app._wsHandlers[path] = handler
    return app
  })

  // Server methods
  app.listen = vi.fn((port: number | string, callback?: Function) => {
    const server = {
      close: vi.fn((cb?: Function) => {
        if (cb) cb()
      }),
      address: vi.fn(() => ({ port: Number(port), address: '127.0.0.1' })),
    }
    if (callback) callback()
    return server
  })

  // Utility methods
  app.set = vi.fn((setting: string, val: any) => {
    app[setting] = val
    return app
  })

  app.get_setting = vi.fn((setting: string) => {
    return app[setting]
  })

  app.enable = vi.fn((setting: string) => {
    app[setting] = true
    return app
  })

  app.disable = vi.fn((setting: string) => {
    app[setting] = false
    return app
  })

  app.enabled = vi.fn((setting: string) => !!app[setting])

  app.disabled = vi.fn((setting: string) => !app[setting])

  app.engine = vi.fn((ext: string, fn: Function) => {
    return app
  })

  app.param = vi.fn((name: string | string[], fn: Function) => {
    return app
  })

  app.route = vi.fn((path: string) => {
    return {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    }
  })

  app.render = vi.fn((view: string, options?: any, callback?: Function) => {
    if (callback) callback(null, 'rendered')
  })

  // Static file serving
  app.serverStatic = vi.fn((urlPath: string, fsPath: string) => {
    return (req: any, res: any, next: any) => next()
  })

  return app
}

/**
 * Factory for creating mock middleware
 */
export function createMockMiddleware(name: string = 'mockMiddleware'): any {
  return vi.fn((req: any, res: any, next: any) => {
    next()
  })
}

/**
 * Factory for creating mock route handlers
 */
export function createMockRouteHandler(name: string = 'mockHandler'): any {
  return vi.fn((req: any, res: any, next: any) => {
    res.json({ success: true, handler: name })
  })
}

/**
 * Helper to simulate a request through the app
 */
export async function simulateRequest(
  app: any,
  method: string,
  path: string,
  options: {
    body?: any
    query?: any
    params?: any
    headers?: any
    cookies?: any
  } = {}
): Promise<any> {
  const req = mockRequest({
    method,
    url: path,
    originalUrl: path,
    path,
    body: options.body || {},
    query: options.query || {},
    params: options.params || {},
    headers: options.headers || {},
    cookies: options.cookies || {},
  })

  const res = mockResponse()
  const next = mockNextFunction()

  const routeKey = `${method.toUpperCase()} ${path}`
  const handlers = app._routes[routeKey]

  if (!handlers) {
    throw new Error(`Route ${routeKey} not found`)
  }

  for (const handler of handlers) {
    await handler(req, res, next)
    if (res.headersSent) break
  }

  return { req, res, next }
}

export default {
  mockRequest,
  mockResponse,
  mockNextFunction,
  createMockExpressApp,
  createMockMiddleware,
  createMockRouteHandler,
  simulateRequest,
}
