import qrcode
import io
import base64
import uuid
import json
from datetime import datetime, timedelta
from app import db, bucket

def generate_qr_code(course_id, lecturer_id, duration_minutes=30):
    """Generate QR code for attendance session"""
    
    # Create session data
    session_id = str(uuid.uuid4())
    expires_at = datetime.now() + timedelta(minutes=duration_minutes)
    
    qr_data = {
        'session_id': session_id,
        'course_id': course_id,
        'lecturer_id': lecturer_id,
        'expires_at': expires_at.isoformat(),
        'type': 'attendance'
    }
    
    # Store session in Firestore
    session_data = {
        'session_id': session_id,
        'course_id': course_id,
        'lecturer_id': lecturer_id,
        'created_at': datetime.now(),
        'expires_at': expires_at,
        'active': True
    }
    
    db.collection('attendance_sessions').document(session_id).set(session_data)
    
    # Generate QR code
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(json.dumps(qr_data))
    qr.make(fit=True)
    
    # Create QR code image
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Convert to base64
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    
    qr_code_base64 = base64.b64encode(buffer.getvalue()).decode()
    
    return {
        'qr_code': f"data:image/png;base64,{qr_code_base64}",
        'session_id': session_id,
        'expires_at': expires_at
    }

def validate_attendance(qr_data_str, student_id):
    """Validate QR code and check attendance eligibility"""
    
    try:
        qr_data = json.loads(qr_data_str)
        
        # Check if it's an attendance QR code
        if qr_data.get('type') != 'attendance':
            return {'valid': False, 'message': 'Invalid QR code type'}
        
        session_id = qr_data.get('session_id')
        course_id = qr_data.get('course_id')
        
        # Check if session exists and is active
        session_doc = db.collection('attendance_sessions').document(session_id).get()
        
        if not session_doc.exists:
            return {'valid': False, 'message': 'Invalid session'}
        
        session_data = session_doc.to_dict()
        
        # Check if session is still active
        if not session_data.get('active', False):
            return {'valid': False, 'message': 'Session is no longer active'}
        
        # Check if session has expired
        expires_at = session_data.get('expires_at')
        if datetime.now() > expires_at:
            # Deactivate expired session
            db.collection('attendance_sessions').document(session_id).update({'active': False})
            return {'valid': False, 'message': 'Session has expired'}
        
        # Check if student is enrolled in the course
        enrollment_query = db.collection('enrollments').where('student_id', '==', student_id).where('course_id', '==', course_id).limit(1)
        enrollments = list(enrollment_query.stream())
        
        if not enrollments:
            return {'valid': False, 'message': 'You are not enrolled in this course'}
        
        # Check if student has already marked attendance for this session
        attendance_query = db.collection('attendance').where('student_id', '==', student_id).where('session_id', '==', session_id).limit(1)
        existing_attendance = list(attendance_query.stream())
        
        if existing_attendance:
            return {'valid': False, 'message': 'Attendance already marked for this session'}
        
        return {
            'valid': True,
            'course_id': course_id,
            'session_id': session_id
        }
        
    except json.JSONDecodeError:
        return {'valid': False, 'message': 'Invalid QR code format'}
    except Exception as e:
        return {'valid': False, 'message': f'Validation error: {str(e)}'}
