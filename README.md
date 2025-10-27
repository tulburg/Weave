# Weave.js

Weave is a modern, chainable API development framework built on Express.js. It provides a clean, functional approach to building REST APIs with built-in middleware chaining, database integration, and validation.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Core Concepts](#core-concepts)
- [How Weave Works Internally](#how-weave-works-internally)
- [API Reference](#api-reference)
- [Sub-Modules](#sub-modules)
- [Examples](#examples)

## Features

- 🔗 **Chainable API**: Clean, readable middleware chains
- 🎯 **Type-safe**: Built with TypeScript
- 🗃️ **Database Integration**: Mongoose helpers for common operations
- ✅ **Built-in Validation**: JSON Schema validation support
- 🔒 **SSL Support**: HTTPS out of the box
- 📝 **Automatic Logging**: Request/response logging with timestamps
- ⚡ **Async/Await**: Full promise support throughout

## Installation

```bash
npm install @weave-protocol/express
```

### Optional Sub-modules

```bash
# Mongoose database helpers
npm install @weave-protocol/mongoose

# JSON Schema validation
npm install @weave-protocol/json-schema-validator

# JWT authentication
npm install @weave-protocol/jsonwebtoken

# Socket.IO integration
npm install @weave-protocol/socket
```

## Quick Start

```typescript
import Weave from "@weave-protocol/express";

const api = new Weave({
  port: 8000
});

api.endpoint('/hello', 'GET')
  .send({ message: 'Hello, World!' });
```

## Core Concepts

### Middleware Chain

Weave uses a middleware chain pattern where each method adds a function to a queue. These functions are executed sequentially when a request is received. Each function can:

- Return `true` to continue to the next middleware
- Return an object with `code` to send a response
- Return a `Promise` for async operations

### Request Lifecycle

1. **Map Phase**: Extract data from request (body, params, headers, query)
2. **Use Phase**: Process and validate the mapped data
3. **DB Phase**: Perform database operations
4. **Send Phase**: Send the response

## How Weave Works Internally

### Initialization

When you create a Weave instance, it:
1. Initializes an Express app
2. Sets up custom response methods (`sendOk`, `sendError`)
3. Configures JSON body parsing
4. Creates an HTTP/HTTPS server
5. Initializes an internal registry to store endpoint handlers

### Endpoint Registration

When you call `endpoint(path, method)`:
1. A unique key is created (`method:path`)
2. An entry is created in the registry with an empty middleware array
3. Express route handler is registered
4. The handler will execute the middleware chain when a request arrives

### Middleware Chain Execution

When a request comes in:
1. Request data is stored in the registry instance
2. Middleware functions are executed sequentially
3. Each function's return value determines flow:
   - `true`: Continue to next middleware
   - `false` or error object: Stop and send error
   - Promise: Wait for resolution, then check value

### Data Flow

```
Request → mapBody → useBody → mapDB → useDB → send → Response
          ↓        ↓          ↓        ↓        ↓
        Extract  Validate   Setup   Query    Response
         Data     Data       DB      DB       Data
```

## API Reference

### Constructor

```typescript
new Weave(options: WeaveConfiguration)
```

**Options:**
- `port?: number` - Server port (default: 8000)
- `driver?: "express"` - HTTP driver
- `useJSON?: boolean` - Enable JSON parsing (default: true)
- `sslKey?: string` - Path to SSL key file
- `sslCert?: string` - Path to SSL certificate file
- `dbConnection?: any` - Mongoose connection instance

### Endpoint Definition

```typescript
endpoint(path: string, method: "POST" | "GET" | "DELETE"): Weave
```

Creates a new endpoint. All subsequent chained methods apply to this endpoint.

**Example:**
```typescript
api.endpoint('/users', 'GET')
```

### Request Data Mapping

#### mapBody(keys: string[]): Weave

Extracts specified keys from request body.

```typescript
api.endpoint('/login', 'POST')
  .mapBody(['email', 'password'])
```

#### mapParams(keys: string[]): Weave

Extracts specified keys from URL parameters.

```typescript
api.endpoint('/users/:id', 'GET')
  .mapParams(['id'])
```

#### mapQuery(keys: string[]): Weave

Extracts specified keys from query string.

```typescript
api.endpoint('/search', 'GET')
  .mapQuery(['q', 'limit'])
```

#### mapHeader(keys: string[]): Weave

Extracts specified keys from request headers.

```typescript
api.endpoint('/protected', 'GET')
  .mapHeader(['authorization'])
```

### Request Data Processing

#### useBody(callback?: CalleeFunction): Weave

Process or validate body data.

```typescript
.useBody((body, instance) => {
  if (!body.email.includes('@')) {
    return { code: 400, message: 'Invalid email' };
  }
  return true;
})
```

#### useParams(callback?: CalleeFunction): Weave

Process URL parameters.

```typescript
.useParams((params, instance) => {
  if (!params.id.match(/^[0-9]+$/)) {
    return { code: 400, message: 'Invalid ID' };
  }
  return true;
})
```

#### useQuery(callback?: CalleeFunction): Weave

Process query parameters.

```typescript
.useQuery((query, instance) => {
  query.limit = parseInt(query.limit) || 10;
  return true;
})
```

#### useHeader(callback?: CalleeFunction): Weave

Process headers (e.g., authentication).

```typescript
.useHeader((header, instance) => {
  if (!header.authorization) {
    return { code: 401, message: 'Unauthorized' };
  }
  return true;
})
```

### Database Operations

#### mapDB(...args: any[]): Weave

Maps database model and schema for subsequent operations.

```typescript
.mapDB('users', UserSchema)
```

#### useDB(callback: (db: any[], instance: any) => Promise<boolean>): Weave

Executes custom database operations.

```typescript
.useDB(async (db, instance) => {
  const [modelName, schema] = db;
  // Perform database operations
  return true;
})
```

### Store

#### useStore(callback?: CalleeFunction): Weave

Access the shared store object (contains request metadata like IP address).

```typescript
.useStore((store, instance) => {
  console.log('Request from:', store.ip);
  return true;
})
```

### Response

#### send(data: any | Function): Weave

Sends the response. Can be a static object or a function that returns data.

```typescript
.send({ message: 'Success!' })

// Or with a function
.send((instance) => {
  return { 
    message: 'Success',
    user: instance.body.email 
  };
})
```

## Sub-Modules

### @weave-protocol/mongoose

Database helpers for MongoDB operations via Mongoose.

#### Installation

```typescript
import { CheckIfExists, FetchWhere, Insert, UpdateWhere } from "@weave-protocol/mongoose";
```

#### Available Helpers

**CheckIfExists** - Check if a document exists

```typescript
api.endpoint('/register', 'POST')
  .mapBody(['email'])
  .mapDB('users', UserSchema)
  .useDB(CheckIfExists.fromBody(['email'], 
    () => ({ code: 400, message: 'User already exists' }),
    () => true
  ))
```

**FetchWhere** - Fetch documents with conditions

```typescript
.useDB(FetchWhere.fromBody(['email'], 
  (data, instance) => {
    instance.store.user = data;
    return true;
  },
  () => ({ code: 404, message: 'User not found' })
))
```

**FetchOne** - Fetch a single document

```typescript
.useDB(FetchOne.fromParams(['id'],
  (user, instance) => {
    return { code: 200, data: user };
  },
  () => ({ code: 404, message: 'Not found' })
))
```

**Insert** - Insert a new document

```typescript
.useDB(Insert.fromBody(['email', 'name'],
  (result, instance) => true,
  () => ({ code: 500, message: 'Insert failed' })
))
```

**UpdateWhere** - Update documents matching criteria

```typescript
.useDB(UpdateWhere(['email']).fromBody(['email', 'name'],
  (result) => ({ code: 200, message: 'Updated' }),
  () => ({ code: 500, message: 'Update failed' })
))
```

**DeleteOne** - Delete a document

```typescript
.useDB(DeleteOne.fromParams(['id'],
  () => ({ code: 200, message: 'Deleted' }),
  () => ({ code: 404, message: 'Not found' })
))
```

**Fetch** - Fetch all documents with pagination

```typescript
.useDB(Fetch.withLimit({ start: 0, limit: 10 },
  (data) => ({ code: 200, data }),
  () => ({ code: 500, message: 'Fetch failed' })
))
```

**Count** - Count documents

```typescript
.useDB(Count.fromQuery(['status'],
  (count) => ({ code: 200, count }),
  () => ({ code: 500, message: 'Count failed' })
))
```

#### Integration Example

```typescript
import Mongoose from "mongoose";
import Weave from "@weave-protocol/express";
import { CheckIfExists, Insert } from "@weave-protocol/mongoose";

const db = Mongoose.createConnection('mongodb://localhost:27017/myapp');

const UserSchema = new Mongoose.Schema({
  email: String,
  name: String,
  password: String
});

const api = new Weave({
  port: 8000,
  dbConnection: db
});

api.endpoint('/register', 'POST')
  .mapBody(['email', 'name', 'password'])
  .mapDB('users', UserSchema)
  .useDB(CheckIfExists.fromBody(['email'],
    () => ({ code: 400, message: 'Email already exists' }),
    () => true
  ))
  .useDB(Insert.fromBody(['email', 'name', 'password'],
    () => ({ code: 201, message: 'User created' }),
    () => ({ code: 500, message: 'Registration failed' })
  ));
```

### @weave-protocol/json-schema-validator

JSON Schema validation for request data.

#### Installation

```typescript
import { JSONSchemaValidator, ShortText, LongText, Username, Password } from "@weave-protocol/json-schema-validator";
```

#### Built-in Validators

- **ShortText**: 1-64 characters
- **LongText**: 4-255 characters
- **Username**: 2-32 characters
- **Password**: 4-255 characters

All validators support `.required()` method.

#### Usage Example

```typescript
api.endpoint('/login', 'POST')
  .mapBody(['email', 'password'])
  .useBody(JSONSchemaValidator({
    email: ShortText.required(),
    password: LongText.required()
  }))
  .send({ message: 'Valid input' });
```

#### Custom Schema

```typescript
.useBody(JSONSchemaValidator({
  age: { type: 'number', minimum: 18, maximum: 120 },
  name: { type: 'string', minLength: 2, maxLength: 50 }
}))
```

### @weave-protocol/jsonwebtoken

JWT token validation and generation (authentication middleware).

```typescript
import { ValidateToken, GenerateToken } from "@weave-protocol/jsonwebtoken";
```

### @weave-protocol/socket

Socket.IO integration for real-time features.

```typescript
import WeaveSocket from "@weave-protocol/socket";
```

## Examples

### Complete REST API Example

```typescript
import Mongoose from "mongoose";
import Weave from "@weave-protocol/express";
import { JSONSchemaValidator, ShortText } from "@weave-protocol/json-schema-validator";
import { CheckIfExists, FetchWhere, Insert } from "@weave-protocol/mongoose";

// Database setup
const db = Mongoose.createConnection('mongodb://localhost:27017/blog');

const PostSchema = new Mongoose.Schema({
  title: String,
  content: String,
  author: String,
  createdAt: { type: Date, default: Date.now }
});

// API setup
const api = new Weave({
  port: 3000,
  dbConnection: db
});

// Create post
api.endpoint('/posts', 'POST')
  .mapBody(['title', 'content', 'author'])
  .useBody(JSONSchemaValidator({
    title: ShortText.required(),
    content: { type: 'string', minLength: 10 },
    author: ShortText.required()
  }))
  .mapDB('posts', PostSchema)
  .useDB(Insert.fromBody(['title', 'content', 'author'],
    (post) => ({ code: 201, data: post }),
    () => ({ code: 500, message: 'Failed to create post' })
  ));

// Get all posts
api.endpoint('/posts', 'GET')
  .mapDB('posts', PostSchema)
  .useDB(async (db, instance) => {
    const [modelName, schema] = db;
    const model = instance.options.dbConnection.model(modelName, schema);
    const posts = await model.find().limit(20);
    instance.response.sendOk({ code: 200, data: posts });
    return true;
  });

// Get single post
api.endpoint('/posts/:id', 'GET')
  .mapParams(['id'])
  .mapDB('posts', PostSchema)
  .useDB(async (db, instance) => {
    const [modelName, schema] = db;
    const model = instance.options.dbConnection.model(modelName, schema);
    const post = await model.findById(instance.params.id);
    if (post) {
      instance.response.sendOk({ code: 200, data: post });
    } else {
      instance.response.sendError({ code: 404, message: 'Post not found' });
    }
    return true;
  });
```

### Authentication Example

```typescript
api.endpoint('/profile', 'GET')
  .mapHeader(['authorization'])
  .useHeader((header, instance) => {
    const token = header.authorization?.replace('Bearer ', '');
    if (!token) {
      return { code: 401, message: 'No token provided' };
    }
    // Verify token (implement your JWT logic)
    try {
      instance.store.user = verifyToken(token);
      return true;
    } catch (e) {
      return { code: 401, message: 'Invalid token' };
    }
  })
  .send((instance) => ({
    message: 'Profile data',
    user: instance.store.user
  }));
```

### HTTPS Setup

```typescript
const api = new Weave({
  port: 443,
  sslKey: './ssl/private.key',
  sslCert: './ssl/certificate.crt'
});
```

## Best Practices

1. **Always validate input**: Use `JSONSchemaValidator` or custom validators
2. **Handle errors gracefully**: Return proper error codes and messages
3. **Use async/await**: For database operations and external API calls
4. **Keep middleware focused**: Each middleware function should do one thing
5. **Store shared data**: Use `instance.store` to pass data between middleware
6. **Type your schemas**: Use TypeScript interfaces for better IDE support

## Response Format

Successful responses (via `sendOk`):
```json
{
  "status": 200,
  "message": "Success",
  "data": { }
}
```

Error responses (via `sendError`):
```json
{
  "status": 400,
  "code": 400,
  "message": "Error message",
  "stack": { }
}
```

## License

MIT

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## Links

- GitHub: https://github.com/tulburg/weavejs
- Issues: https://github.com/tulburg/weavejs/issues
