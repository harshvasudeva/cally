# Cally - Self-Hosted Calendar & Scheduling

A powerful, self-hosted calendar application combining the best features of **Calendly** and **Google Calendar**. Built with Next.js for easy deployment.

![Cally](https://img.shields.io/badge/Cally-Calendar-6366f1?style=for-the-badge)

## ✨ Features

- 📅 **Multi-View Calendar** - Day, Week, Month, and Agenda views
- 🗓️ **Appointment Scheduling** - Calendly-style public booking pages
- ⏰ **Availability Management** - Set your working hours
- 📥 **Import/Export** - ICS file support (Google Calendar, Outlook, Apple)
- 🔄 **Recurring Events** - Daily, weekly, monthly patterns
- 👥 **Admin Dashboard** - User management and settings
- 🌍 **Timezone Support** - Automatic timezone detection
- ⏱️ **Buffer Times** - Gaps between appointments
- 🎨 **Premium UI** - Dark theme with glassmorphism

## 🚀 Quick Start

```bash
# Clone and install
git clone <repo-url> cally
cd cally
npm install

# Setup database
npx prisma migrate dev

# Run the app
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 🔧 Configuration

Create a `.env.local` file:

```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"
```

## 📖 Usage

### First Time Setup
1. Register an account (first user becomes admin)
2. Set your availability in `/availability`
3. Create event types in `/appointment-types`
4. Share your booking link: `/book/your-username`

### For Guests
1. Visit your host's booking page
2. Select a date and available time
3. Fill in your details
4. Receive confirmation

## 🐳 Docker Deployment

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm ci
RUN npx prisma generate
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

```bash
docker build -t cally .
docker run -p 3000:3000 cally
```

## 📁 Project Structure

```
├── prisma/          # Database schema
├── src/
│   ├── app/         # Next.js pages
│   │   ├── api/     # API routes
│   │   ├── admin/   # Admin pages
│   │   └── book/    # Public booking
│   ├── components/  # React components
│   └── lib/         # Utilities
```

## 🛠️ Tech Stack

- **Next.js 16** - React framework
- **Prisma** - Database ORM
- **SQLite** - Database (easy to switch to PostgreSQL)
- **NextAuth.js** - Authentication
- **FullCalendar** - Calendar component
- **Tailwind CSS** - Styling

## 📝 License

MIT License - feel free to use for any purpose.

---

Built with ❤️ for self-hosters
