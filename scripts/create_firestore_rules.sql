-- Firestore Security Rules for EduTrack
-- Copy these rules to your Firebase Console > Firestore Database > Rules

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Users collection
    match /users/{userId} {
      // Users can read their own data
      allow read: if request.auth != null && request.auth.uid == userId;
      
      // Users can update their own profile (except role and approval status)
      allow update: if request.auth != null && 
                   request.auth.uid == userId &&
                   !('role' in request.resource.data.diff(resource.data).affectedKeys()) &&
                   !('approved' in request.resource.data.diff(resource.data).affectedKeys());
      
      // Admins can read and write all user data
      allow read, write: if request.auth != null && 
                        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
      
      // Allow user creation during signup
      allow create: if request.auth != null && request.auth.uid == userId;
    }
    
    // Courses collection
    match /courses/{courseId} {
      // Anyone can read course data (for enrollment purposes)
      allow read: if request.auth != null;
      
      // Lecturers can create courses
      allow create: if request.auth != null && 
                   get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'lecturer' &&
                   request.resource.data.lecturer_id == request.auth.uid;
      
      // Lecturers can update their own courses
      allow update: if request.auth != null && 
                   resource.data.lecturer_id == request.auth.uid;
      
      // Admins can read, write, and delete all courses
      allow read, write, delete: if request.auth != null && 
                                 get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Enrollments collection
    match /enrollments/{enrollmentId} {
      // Students can read their own enrollments
      allow read: if request.auth != null && 
                 resource.data.student_id == request.auth.uid;
      
      // Lecturers can read enrollments for their courses
      allow read: if request.auth != null && 
                 get(/databases/$(database)/documents/courses/$(resource.data.course_id)).data.lecturer_id == request.auth.uid;
      
      // Lecturers can create enrollments for their courses
      allow create: if request.auth != null && 
                   get(/databases/$(database)/documents/courses/$(request.resource.data.course_id)).data.lecturer_id == request.auth.uid;
      
      // Admins can read and write all enrollments
      allow read, write: if request.auth != null && 
                        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Attendance collection
    match /attendance/{attendanceId} {
      // Students can read their own attendance records
      allow read: if request.auth != null && 
                 resource.data.student_id == request.auth.uid;
      
      // Students can create their own attendance records
      allow create: if request.auth != null && 
                   request.resource.data.student_id == request.auth.uid;
      
      // Lecturers can read attendance for their courses
      allow read: if request.auth != null && 
                 get(/databases/$(database)/documents/courses/$(resource.data.course_id)).data.lecturer_id == request.auth.uid;
      
      // Admins can read all attendance records
      allow read: if request.auth != null && 
                 get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Attendance sessions collection
    match /attendance_sessions/{sessionId} {
      // Lecturers can read and write their own sessions
      allow read, write: if request.auth != null && 
                        resource.data.lecturer_id == request.auth.uid;
      
      // Students can read active sessions (for QR validation)
      allow read: if request.auth != null && 
                 get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'student' &&
                 resource.data.active == true;
      
      // Admins can read all sessions
      allow read: if request.auth != null && 
                 get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
