# GMinsta Backend (Express + MongoDB + Mongoose + Socket.io)

A standalone Node.js backend for **GMinsta**, refactored to use **MongoDB** via **Mongoose** (no SQL/Sequelize). Runs locally and exposes a REST + WebSocket API the frontend can talk to.

> The Lovable preview frontend in this repo currently uses Lovable Cloud (Supabase). This `server/` folder is a separate, self-contained backend you run locally per the spec — it does **not** run inside the Lovable sandbox.

---

## 🧱 Stack

- **Runtime:** Node.js 18+
- **Framework:** Express
- **DB:** MongoDB (local) via Mongoose
- **Auth:** JWT + bcrypt
- **Realtime:** Socket.io
- **Uploads:** Multer (local `/uploads`)

---

## 📁 Structure (MVC)

```
server/
├── src/
│   ├── config/        # DB connection
│   ├── models/        # Mongoose schemas (User, Post, Message, Notification)
│   ├── controllers/   # Business logic
│   ├── routes/        # Express routes
│   ├── middleware/    # auth, error, upload
│   ├── socket/        # Socket.io handlers
│   ├── utils/         # token helpers
│   ├── app.js         # Express app
│   └── index.js       # Entry (DB + HTTP + sockets)
├── .env.example
└── package.json
```

---

## ⚙️ Setup

### 1. Install MongoDB locally
- macOS: `brew install mongodb-community && brew services start mongodb-community`
- Ubuntu: follow https://www.mongodb.com/docs/manual/administration/install-on-linux/
- Windows: install MongoDB Community Server, ensure `mongod` runs.

Default URI: `mongodb://127.0.0.1:27017/gminsta`

### 2. Install deps
```bash
cd server
npm install
```

### 3. Configure env
```bash
cp .env.example .env
# edit JWT_SECRET, etc.
```

### 4. Run
```bash
npm run dev   # nodemon
# or
npm start
```

Server: `http://localhost:5000`
Health check: `GET /api/health`

---

## 🔐 Env vars (`.env`)

```
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/gminsta
JWT_SECRET=change_this_to_a_long_random_string
JWT_EXPIRES_IN=7d
CLIENT_ORIGIN=http://localhost:8080
UPLOAD_DIR=uploads
```

---

## 📡 API Reference

All authenticated routes require header: `Authorization: Bearer <token>`

### Auth
| Method | Path                | Auth | Body                                         |
|--------|---------------------|------|----------------------------------------------|
| POST   | `/api/auth/register`| ❌   | `{ username, email, password, displayName? }`|
| POST   | `/api/auth/login`   | ❌   | `{ email, password }`                        |
| GET    | `/api/auth/me`      | ✅   | —                                            |

### Users
| Method | Path                       | Auth | Notes                          |
|--------|----------------------------|------|--------------------------------|
| GET    | `/api/users/search?q=`     | ✅   | Search by username/displayName |
| GET    | `/api/users/suggestions`   | ✅   | People to follow               |
| GET    | `/api/users/:username`     | ❌   | Public profile                 |
| PUT    | `/api/users`               | ✅   | Update own profile             |
| POST   | `/api/users/:id/follow`    | ✅   | Follow                         |
| DELETE | `/api/users/:id/follow`    | ✅   | Unfollow                       |

### Posts
| Method | Path                        | Auth | Notes                                     |
|--------|-----------------------------|------|-------------------------------------------|
| GET    | `/api/posts/feed?page=0&limit=10` | ✅ | Following + own                       |
| GET    | `/api/posts/explore`        | ❌   | Latest                                    |
| GET    | `/api/posts/user/:username` | ❌   | A user's posts                            |
| GET    | `/api/posts/hashtag/:tag`   | ❌   | Posts by hashtag                          |
| POST   | `/api/posts`                | ✅   | multipart/form-data: `image`, `caption`   |
| DELETE | `/api/posts/:id`            | ✅   | Owner only                                |
| POST   | `/api/posts/:id/like`       | ✅   | Toggle like                               |
| POST   | `/api/posts/:id/comments`   | ✅   | `{ text }`                                |

### Messages
| Method | Path                  | Auth | Notes                       |
|--------|-----------------------|------|-----------------------------|
| GET    | `/api/messages`       | ✅   | Conversation list           |
| GET    | `/api/messages/:userId` | ✅ | Thread (marks read)         |
| POST   | `/api/messages`       | ✅   | `{ receiver, content }`     |

### Notifications
| Method | Path                      | Auth |
|--------|---------------------------|------|
| GET    | `/api/notifications`      | ✅   |
| POST   | `/api/notifications/seen` | ✅   |

---

## 🔌 Socket.io

Connect with the JWT in `auth.token`:
```js
import { io } from "socket.io-client";
const socket = io("http://localhost:5000", { auth: { token: jwt } });

socket.emit("message:send", { receiver: "<userId>", content: "hi" }, (ack) => console.log(ack));
socket.on("message:new", (m) => console.log("incoming", m));
socket.emit("message:read", { from: "<userId>" });
```

Events:
- `message:send` (client → server) — send a chat message
- `message:new` (server → client) — incoming message
- `message:sent` (server → sender) — confirmation
- `message:read` (both ways) — mark messages from a user as read

---

## 🗃️ Data Models

- **User** — `username, email, password (hashed), displayName, bio, profilePhoto, isPrivate, followers[ObjectId<User>], following[ObjectId<User>]`
- **Post** — `user(ObjectId<User>), caption, image, hashtags[], likes[ObjectId<User>], comments[{ user, text, timestamps }]`
- **Message** — `sender, receiver (ObjectId<User>), content, status('sent'|'delivered'|'read')`
- **Notification** — `user, actor (ObjectId<User>), type('like'|'comment'|'follow'), referenceId, seen`

Relationships use `ObjectId` refs and `populate()` (e.g. feed populates `user` and `comments.user`).

---

## ✅ Feature parity

- JWT auth + bcrypt password hashing
- Profiles (bio, avatar, private toggle)
- Follow / unfollow + suggestions
- Posts with image upload, hashtags auto-extracted from caption
- Likes + comments (+ notifications)
- Real-time chat with sent/delivered/read status
- Notifications (like/comment/follow)
- Search (users + hashtags via `/api/posts/hashtag/:tag`)

---

## 🧪 Quick smoke test

```bash
# 1) Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","email":"alice@example.com","password":"secret123"}'

# 2) Login → grab token
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"secret123"}' | jq -r .token)

# 3) Me
curl http://localhost:5000/api/auth/me -H "Authorization: Bearer $TOKEN"
```
