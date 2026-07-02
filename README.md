# Restaurant Reservation Management System (RRMS)

A full-stack web application that enables customers to reserve restaurant tables while providing administrators with tools to manage reservations and restaurant tables efficiently.

## Technology Stack

- **Frontend**: React.js with Vite
- **Backend**: Node.js + Express.js
- **Database**: MongoDB
- **Authentication**: JWT (JSON Web Tokens)
- **Deployment**: 
  - Frontend: Vercel
  - Backend: Render
  - Database: MongoDB Atlas

## Features

### Customer Features
- User registration and login
- After successful login, redirected to My Reservations dashboard
- Create table reservations with detailed confirmation
- View upcoming and past reservations
- Cancel own reservations (with table becoming available again)
- Automatic table assignment based on availability and capacity
- Logout button (clears session and redirects to login)

### Customer Dashboard
- Reservation creation form with validation
- Upcoming Reservations section showing:
  - Reservation Date
  - Time Slot
  - Number of Guests
  - Assigned Table
  - Reservation Status
  - Cancel Reservation button
- Past Reservations section for history
- Empty state: "No upcoming reservations. Create your first reservation above."

### Admin Features
- View all reservations with filtering (by date, status)
- Edit any reservation
- Cancel any reservation
- Create, update, and delete tables
- Dashboard with statistics (total reservations, today's reservations, cancelled reservations, available tables)

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or MongoDB Atlas)
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the backend directory:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/restaurant-reservation
JWT_SECRET=your_jwt_secret_key_here_change_in_production
NODE_ENV=development
```

4. Start the backend server:
```bash
npm run dev
```

The backend will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the frontend development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:3000`

### Creating an Admin Account

By default, all registered users have the "customer" role. To create an admin account:

1. Register a new user through the application
2. Connect to your MongoDB database
3. Update the user's role in the `users` collection:
```javascript
db.users.updateOne(
  { email: "admin@example.com" },
  { $set: { role: "admin" } }
)
```

## Assumptions

1. **Single Restaurant**: The system is designed for a single restaurant location.
2. **Fixed Time Slots**: Reservations can only be made for predefined time slots (11:00 AM to 9:00 PM, hourly).
3. **One Reservation Per Table Per Slot**: A table can only have one reservation per time slot.
4. **No Online Payment**: The system does not handle payments; reservations are confirmed immediately.
5. **No Notifications**: The system does not send email or SMS notifications.
6. **No Multi-branch Support**: The system does not support multiple restaurant branches.
7. **Table Capacity is Fixed**: Each table has a fixed seating capacity that cannot be dynamically adjusted.

## Reservation Logic

### Table Assignment Algorithm

When a customer creates a reservation, the system follows this algorithm:

1. **Find Available Tables**: Retrieve all tables with status "available"
2. **Filter by Capacity**: Select tables where capacity >= guest count
3. **Remove Booked Tables**: Exclude tables already booked for the same date and time slot (cancelled reservations do not block availability)
4. **Optimal Assignment**: Sort remaining tables by capacity in ascending order (smallest suitable table first)
5. **Assign Table**: Assign the first table from the sorted list
6. **Handle No Availability**: If no suitable table exists after applying capacity and reservation conflict checks, return a clear error message indicating that no tables are available

### Availability Validation Requirement

If no suitable table exists after applying capacity and reservation conflict checks, the system shall return a clear error message indicating that no tables are available. If suitable tables do exist, the system shall automatically assign the smallest available table and create the reservation successfully.

### Business Rules Implemented

1. **Authentication Required**: Customers must be logged in to make reservations
2. **No Double Bookings**: Only one reservation per table for the same date and time
3. **Capacity Validation**: Guest count cannot exceed table capacity
4. **Past Date Prevention**: Cannot make reservations for past dates
5. **Cancellation Rules**: 
   - Customers can only cancel their own reservations
   - Past reservations cannot be cancelled
   - After cancellation, status becomes "Cancelled" and assigned table becomes available again
   - Reservation history remains visible
6. **Edit Restrictions**: Past reservations cannot be edited
7. **Admin Privileges**: Only admins can manage tables and edit/cancel any reservation
8. **Maximum Restaurant Capacity**: Guest count must be greater than 0 and within restaurant capacity (max 50)
9. **Optimal Table Assignment**: The smallest available table that satisfies the guest count is automatically assigned

### Validation Rules

The application validates the following before saving a reservation:

**Reservation Date**
- Cannot be in the past
- Error message: "Please select a valid reservation date"

**Time Slot**
- Must belong to available restaurant slots (11:00 AM to 9:00 PM, hourly)
- Error message: "Please select a valid time slot"

**Guest Count**
- Must be greater than 0
- Must be within maximum restaurant capacity (50)
- Error message: "Maximum seating capacity exceeded"

**Duplicate Booking**
- A table cannot have two active reservations for the same date and time slot
- Error message: "No tables available for the selected date, time, and guest count"

**Table Capacity**
- A table must satisfy: Table Capacity >= Guest Count
- Error message: "No tables available for the selected date, time, and guest count"

### Error Handling

The application displays meaningful error messages for various conditions:

| Condition | Error Message |
|-----------|---------------|
| No available table | "No tables available for the selected date, time, and guest count." |
| Guest count exceeds maximum capacity | "Maximum seating capacity exceeded." |
| Invalid date | "Please select a valid reservation date." |
| Invalid time slot | "Please select a valid time slot." |
| Reservation not found | "Reservation not found." |
| Unauthorized access | "Please login to continue." |

### Reservation Confirmation

When a reservation is successfully created, the system displays:

- "Reservation Created Successfully"
- Assigned Table: [Table Number]
- Date: [Formatted Date]
- Time: [Time Slot]
- Guests: [Guest Count]

The reservation appears immediately in the Upcoming Reservations section.

### Empty State

If the customer has no reservations, the application displays:
- "No upcoming reservations."
- "Create your first reservation above."

## Role-Based Access Control (RBAC)

### Customer Role
- Register and login
- View own profile
- Create reservations
- View own reservations (upcoming and past)
- Cancel own reservations (only if not past)

### Admin Role
- All customer permissions plus:
- View all reservations
- Filter reservations by date and status
- Edit any reservation (except past reservations)
- Cancel any reservation
- Create tables
- Update tables
- Delete tables (only if no active reservations)
- View dashboard statistics

### Implementation Details

- JWT tokens contain user ID and role
- Middleware (`auth.js`) verifies tokens and extracts user information
- Admin middleware (`adminAuth`) checks if user role is "admin"
- Frontend routes are protected based on user role
- API endpoints have appropriate middleware to enforce permissions

## Known Limitations

1. **No Real-time Updates**: The system does not use WebSockets, so changes are not reflected in real-time across multiple users
2. **No Waitlist**: If no tables are available, customers cannot join a waitlist
3. **No Email/SMS Notifications**: Users do not receive confirmation emails or reminders
4. **No Payment Integration**: The system does not handle payments or deposits
5. **Limited Time Slots**: Only hourly slots from 11 AM to 9 PM are supported
6. **No Multi-restaurant Support**: Cannot manage multiple restaurant locations
7. **No Analytics**: Limited analytics beyond basic statistics
8. **No Menu Integration**: The system does not include food ordering or menu viewing
9. **No Google Calendar Integration**: Reservations are not synced with external calendars
10. **Static Capacity**: Table capacity is fixed and cannot be adjusted for special arrangements

## Future Enhancements

1. **Email Confirmation**: Send confirmation emails when reservations are created
2. **SMS Reminders**: Send SMS reminders before reservation time
3. **Google Calendar Integration**: Allow users to add reservations to their calendar
4. **Waitlist Management**: Implement a waitlist for when no tables are available
5. **Dynamic Pricing**: Implement surge pricing during peak hours
6. **Advanced Analytics Dashboard**: Detailed analytics with charts and trends
7. **AI-based Demand Prediction**: Predict busy periods and optimize table allocation
8. **Real-time Updates**: Use WebSockets for real-time reservation updates
9. **Online Payment Integration**: Accept deposits or full payments
10. **Multi-restaurant Support**: Manage multiple restaurant locations
11. **QR Menu**: Allow customers to view menu via QR codes
12. **Loyalty Program**: Implement customer loyalty points and rewards
13. **Live Table Tracking**: Real-time table status updates
14. **Flexible Time Slots**: Allow custom time slots instead of fixed hourly slots
15. **Customer Reviews**: Allow customers to rate their dining experience

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user info

### Customer Reservations
- `GET /api/reservations` - Get user's reservations
- `POST /api/reservations` - Create new reservation
- `DELETE /api/reservations/:id` - Cancel reservation

### Admin
- `GET /api/admin/reservations` - Get all reservations (with filters)
- `PUT /api/admin/reservations/:id` - Update reservation
- `DELETE /api/admin/reservations/:id` - Cancel any reservation
- `GET /api/admin/stats` - Get dashboard statistics

### Tables
- `GET /api/tables` - Get all tables
- `POST /api/tables` - Create table (admin only)
- `PUT /api/tables/:id` - Update table (admin only)
- `DELETE /api/tables/:id` - Delete table (admin only)

## Database Schema

### User Collection
```javascript
{
  _id: ObjectId,
  name: String,
  email: String (unique),
  password: String (hashed),
  role: String (enum: 'customer', 'admin'),
  createdAt: Date,
  updatedAt: Date
}
```

### Table Collection
```javascript
{
  _id: ObjectId,
  tableNumber: String (unique),
  capacity: Number,
  status: String (enum: 'available', 'maintenance'),
  createdAt: Date,
  updatedAt: Date
}
```

### Reservation Collection
```javascript
{
  _id: ObjectId,
  user: ObjectId (ref: User),
  table: ObjectId (ref: Table),
  reservationDate: Date,
  timeSlot: String,
  guestCount: Number,
  status: String (enum: 'confirmed', 'cancelled'),
  createdAt: Date,
  updatedAt: Date
}
```

## Error Handling

The API returns appropriate HTTP status codes:

- `400 Bad Request` - Invalid input data
- `401 Unauthorized` - Authentication required or invalid token
- `403 Forbidden` - Admin access required or insufficient permissions
- `404 Not Found` - Resource not found
- `409 Conflict` - Table already booked or email already registered
- `500 Internal Server Error` - Unexpected server error

## Security Considerations

1. **Password Hashing**: Passwords are hashed using bcrypt before storage
2. **JWT Authentication**: All protected routes require valid JWT tokens
3. **Environment Variables**: Sensitive data (JWT secret, MongoDB URI) stored in environment variables
4. **Input Validation**: All inputs are validated using express-validator
5. **Role-Based Access**: Admin-only routes protected by middleware
6. **CORS**: CORS configured to allow frontend-backend communication

## License

This project is created for educational purposes.

## Author

Shravan Kumar
