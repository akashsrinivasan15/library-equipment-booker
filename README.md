# Library Equipment Booker 📚💻

A full-stack web application designed to help students and faculty members check equipment availability, book library items (like laptops, cameras, and projectors), and manage reservations.

---

## ✨ Features

* 🔍 **Browse Equipment** – View all available library items (laptops, cameras, projectors, and more)
* 📅 **Real-Time Availability** – Check what's currently available before booking
* 📝 **Book Equipment** – Reserve items for a specific date/time range
* 📊 **Manage Reservations** – View, edit, or cancel your existing bookings
* 📈 **Admin Dashboard** – Track inventory, usage, and overdue returns *(if applicable)*

---

## 🚀 Tech Stack

* **Frontend:** React.js, TailwindCSS
* **Backend:** Node.js, Express.js
* **Database:** MySQL

---

## 🛠️ Getting Started & Setup Instructions

To run this project locally on your machine, follow these steps:

### 1. Clone the Repository

```bash
git clone https://github.com/akashsrinivasan15/library-equipment-booker.git
cd library-equipment-booker
```

### 2. Set Up the Backend

```bash
cd server
npm install
```

Create a `.env` file inside the `server` directory with the following variables:

```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=library_equipment_booker
JWT_SECRET=your_jwt_secret
```

### 3. Set Up the Database

* Open MySQL and create a database:

```sql
CREATE DATABASE library_equipment_booker;
```

* Import the provided schema (if available):

```bash
mysql -u root -p library_equipment_booker < database/schema.sql
```

### 4. Start the Backend Server

```bash
npm start
```

The backend should now be running at `http://localhost:5000`.

### 5. Set Up the Frontend

Open a new terminal window:

```bash
cd client
npm install
```

Create a `.env` file inside the `client` directory:

```env
REACT_APP_API_URL=http://localhost:5000/api
```

### 6. Start the Frontend

```bash
npm start
```

The app should now be running at `http://localhost:3000`.

---

## 📁 Project Structure

```
library-equipment-booker/
├── client/                # React frontend
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── ...
│   └── package.json
├── server/                # Express backend
│   ├── controllers/
│   ├── routes/
│   ├── models/
│   └── package.json
├── database/
│   └── schema.sql
└── README.md
```



---

## 👤 Author

**Akash Srinivasan**
GitHub: [@akashsrinivasan15](https://github.com/akashsrinivasan15)
