# Food Ordering System

A full-stack Food Ordering System built using **React** for the frontend, **Flask** for the backend, and **SQLite** as the database.  
This project demonstrates core **Database Management System (DBMS)** concepts such as relational schema design, CRUD operations, normalization, transactions, and query handling in a real-world web application.

---

# Features

## User Features
- User Registration & Login
- Browse Food Menu
- Add Items to Cart
- Place Orders
- View Order History
- Search & Filter Food Items

## Admin Features
- Add / Update / Delete Food Items
- Manage Orders
- Update Order Status
- View Customer Details

## Database Features
- Relational Database Design
- Primary & Foreign Keys
- SQL Queries using SQLite
- Transaction Handling
- Data Integrity Constraints

---

# Tech Stack

| Technology | Usage |
|------------|------|
| React.js | Frontend UI |
| Flask | Backend API |
| SQLite | Database |
| Python | Backend Logic |
| SQLAlchemy | ORM for Database Operations |
| Axios | API Requests |
| Bootstrap / CSS | Styling |

---

# Running It
```bash
# Backend
pip install flask
python backend_app.py        # starts on :5050, seeds DB automatically

# Frontend (in a React project)
# Replace src/App.js content with food_ordering_app.jsx
npm start
```
---

# Project Structure

```bash
food-ordering-system/
│
├── backend/
│   ├── app.py
│   ├── models.py
│   ├── routes/
│   ├── database.db
│   ├── requirements.txt
│   └── config.py
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── components/
│
└── README.md

