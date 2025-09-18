# EduTrack - Smart Attendance System

A comprehensive Flask-based attendance management system using QR codes and Firebase integration.

## Features

- **Role-based Authentication**: Admin, Lecturer, and Student roles
- **QR Code Attendance**: Real-time QR code generation and scanning
- **Firebase Integration**: Authentication, Firestore database, and Cloud Storage
- **Responsive Design**: Mobile-first approach for seamless phone usage
- **Real-time Validation**: Prevents duplicate attendance and validates sessions
- **Analytics Dashboard**: Attendance reports and statistics

## Tech Stack

- **Backend**: Flask (Python)
- **Frontend**: HTML, CSS, JavaScript, Bootstrap
- **Authentication**: Firebase Authentication
- **Database**: Firebase Firestore
- **Storage**: Firebase Cloud Storage

## Setup Instructions

### 1. Prerequisites

- Python 3.8+
- Firebase project with Firestore and Authentication enabled
- Firebase service account key

### 2. Installation

\`\`\`bash
# Clone the repository
git clone <repository-url>
cd edutrack-attendance

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
\`\`\`

### 3. Firebase Setup

1. Create a Firebase project at https://console.firebase.google.com
2. Enable Authentication (Email/Password and Google Sign-In)
3. Create a Firestore database
4. Generate a service account key and save as `firebase-service-account.json`
5. Update `firebaseConfig.js` with your Firebase configuration

### 4. Environment Variables

Create a `.env` file:

\`\`\`
SECRET_KEY=your-secret-key-here
FIREBASE_PROJECT_ID=your-project-id
\`\`\`

### 5. Run the Application

\`\`\`bash
python app.py
\`\`\`

The application will be available at `http://localhost:5000`

## Usage

### For Students
1. Sign up with email/password or Google
2. Enroll in courses (contact lecturer/admin)
3. Use the QR scanner to mark attendance
4. View attendance history

### For Lecturers
1. Sign up and wait for admin approval
2. Create and manage courses
3. Generate QR codes for attendance sessions
4. View attendance reports

### For Admins
1. Approve lecturer accounts
2. Manage all courses and users
3. View system-wide attendance reports

## Security Features

- Role-based access control
- Session validation with expiration
- Duplicate attendance prevention
- Firebase security rules enforcement

## API Endpoints

- `POST /api/mark-attendance` - Mark student attendance
- `POST /api/generate-qr` - Generate QR code for session
- `POST /api/create-course` - Create new course
- `GET /api/attendance-report` - Get attendance reports

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License.
