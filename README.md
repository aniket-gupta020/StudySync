# StudySync - Collaborative Virtual Learning Platform

![StudySync](https://img.shields.io/badge/MERN-Stack-green)
![Socket.io](https://img.shields.io/badge/Socket.io-Real--Time-blue)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-Glassmorphism-purple)

A futuristic, real-time collaborative learning platform built with the MERN stack, featuring glassmorphism design, live chat, collaborative whiteboard, and more.

## ✨ Features

### Phase 1: Foundation (Completed)
- ✅ **Authentication System**: JWT-based auth with role selection (Student/Tutor)
- ✅ **Glassmorphism UI**: Beautiful frosted glass effects with vibrant mesh gradients
- ✅ **Light/Dark Mode**: Full theme support with localStorage persistence
- ✅ **Responsive Design**: Mobile-first design optimized for all screen sizes
- ✅ **Study Groups**: Create, manage, and join groups with unique invite codes

### Upcoming Features
- 📁 **Resource Hub**: Upload and share PDFs/Images (AWS S3 integration)
- 💬 **Live Chat**: Real-time messaging with Socket.io
- 🎨 **Collaborative Whiteboard**: HTML5 Canvas with real-time sync
- 🎯 **Quizzing System**: Flashcards with leaderboards
- 👨‍🏫 **Tutor Marketplace**: Find and book tutors

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- MongoDB Atlas account (or local MongoDB)
- npm or yarn

### Installation

1. **Clone the repository** (if not already done)
```bash
cd c:\xampp\htdocs\Projectss\StudySync
```

2. **Install server dependencies**
```bash
cd server
npm install
```

3. **Install client dependencies**
```bash
cd ../client
npm install
```

4. **Environment Setup**

The server `.env` file is configured with MongoDB credentials:
- **MongoDB Cluster**: studysync.jpb2hji.mongodb.net (DNS verified via nslookup)
- **Connection**: Using cluster hostname for automatic load balancing and failover
- **Database**: studysync
- **Features**: Retry writes enabled with majority write concern

```env
MONGO_URI=mongodb+srv://akguptaji_admin:DtioQXPzXan49xDK@studysync.jpb2hji.mongodb.net/studysync?retryWrites=true&w=majority&appName=StudySync
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production_12345
PORT=5000
CLIENT_URL=http://localhost:5173
```

### Running the Application

#### 🚀 Quick Start (Recommended)

**Option 1: Double-click startup script**
```bash
# Simply double-click start.bat (opens both servers + browser)
start.bat
```

**Option 2: PowerShell startup script**
```bash
# Run from project root
.\start.ps1
```

Both servers will start in separate windows and the browser will open automatically!

#### 📝 Manual Start

**Backend:**
```bash
cd server
npm start
# OR for development with auto-reload:
npm run dev
```
Server will run on `http://localhost:5000`

**Frontend:**
```bash
cd client
npm start
# OR alternatively:
npm run dev
```
Client will run on `http://localhost:5173`

3. **Open your browser** and navigate to `http://localhost:5173`

## 🎨 Tech Stack

### Backend
- **Express.js** - Web framework
- **MongoDB** - Database with Mongoose ODM
- **Socket.io** - Real-time communication
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **nanoid** - Unique invite code generation

### Frontend
- **React 18** - UI library
- **Vite** - Build tool
- **Tailwind CSS** - Utility-first CSS
- **Framer Motion** - Animations
- **Socket.io Client** - WebSocket client
- **Axios** - HTTP client
- **React Router DOM** - Routing
- **React Hot Toast** - Notifications
- **Lucide React** - Icons

## 📁 Project Structure

```
StudySync/
├── server/
│   ├── config/
│   │   └── db.js                 # MongoDB connection
│   ├── middleware/
│   │   └── auth.js               # JWT authentication
│   ├── models/
│   │   ├── User.js               # User schema
│   │   └── Group.js              # Study group schema
│   ├── routes/
│   │   ├── auth.js               # Auth endpoints
│   │   └── groups.js             # Group CRUD endpoints
│   ├── .env                      # Environment variables
│   ├── server.js                 # Main server file
│   └── package.json
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Navbar.jsx
│   │   │   │   ├── Sidebar.jsx
│   │   │   │   └── Layout.jsx
│   │   │   └── groups/
│   │   │       ├── CreateGroupModal.jsx
│   │   │       └── GroupCard.jsx
│   │   ├── context/
│   │   │   ├── ThemeContext.jsx
│   │   │   └── AuthContext.jsx
│   │   ├── pages/
│   │   │   ├── auth/
│   │   │   │   ├── Login.jsx
│   │   │   │   └── Register.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Groups.jsx
│   │   │   └── GroupDetails.jsx
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
└── README.md
```

## 🎯 Usage Guide

### 1. Registration
- Navigate to `/register`
- Enter your name, email, and password
- Select role: **Student** or **Tutor**
- Click "Create Account"

### 2. Creating a Study Group
- Go to "Study Groups" from the sidebar
- Click "Create Group"
- Enter group name and description
- Group is created with a unique invite code

### 3. Sharing Invite Links
- Click "Copy Invite Link" on any group card
- Share the link with others
- They can join using the link or invite code

### 4. Theme Toggle
- Click the sun/moon icon in the navbar
- Theme preference is saved automatically

## 🔮 Upcoming Phases

### Phase 2: Resource Hub
- File upload with drag-and-drop
- PDF and image support
- AWS S3 integration for cloud storage

### Phase 3: Real-Time Features
- Live chat with message history
- Collaborative whiteboard with drawing tools
- Real-time cursor synchronization

### Phase 4: Quizzing & Marketplace
- Create and study flashcards
- Leaderboard system
- Tutor profiles and booking system

## 🎨 Design Philosophy

### Glassmorphism
All UI components use frosted glass effects with:
- `backdrop-filter: blur(10px)`
- Semi-transparent backgrounds
- Subtle borders and shadows
- Vibrant mesh gradient backgrounds

### Responsive Design
- **Mobile**: < 768px (Vivo T2 Pro compatible)
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px (16-inch laptop optimized)

## 📝 API Endpoints

### Authentication
- `POST /api/auth/register` - Create new account
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/theme` - Update theme preference

### Study Groups
- `GET /api/groups` - Get all user's groups
- `POST /api/groups` - Create new group
- `GET /api/groups/:id` - Get group details
- `PUT /api/groups/:id` - Update group
- `DELETE /api/groups/:id` - Delete group
- `POST /api/groups/join/:inviteCode` - Join group

## 🤝 Contributing

This is a class project. For feature requests or bugs, please contact the development team.

## 📄 License

MIT License - feel free to use this project for learning purposes.

## 🙏 Acknowledgments

- Design inspiration: Modern glassmorphism trends
- MongoDB Atlas for database hosting
- Vercel/Netlify for potential deployment

---

**Built with ❤️ using the MERN Stack**
