from flask import render_template, request, jsonify, session, redirect
from app import app, db, bucket
from auth import login_required, role_required
from models import generate_qr_code, validate_attendance
from analytics import analytics
from reports import report_generator
from datetime import datetime, timedelta
import uuid
from firebase_admin import auth

@app.route('/')
def index():
    if 'user' in session:
        role = session['user']['role']
        if role == 'admin':
            return redirect('/admin-dashboard')
        elif role == 'lecturer':
            return redirect('/lecturer-dashboard')
        else:
            return redirect('/student-dashboard')
    return redirect('/login')

@app.route('/student-dashboard')
@role_required('student')
def student_dashboard():
    user = session['user']
    
    # Get enrolled courses with additional info
    enrollments = db.collection('enrollments').where('student_id', '==', user['uid']).stream()
    courses = []
    
    for enrollment in enrollments:
        course_id = enrollment.to_dict()['course_id']
        course_doc = db.collection('courses').document(course_id).get()
        if course_doc.exists:
            course_data = course_doc.to_dict()
            course_data['id'] = course_id
            
            # Get lecturer name
            lecturer_doc = db.collection('users').document(course_data['lecturer_id']).get()
            if lecturer_doc.exists:
                course_data['lecturer_name'] = lecturer_doc.to_dict().get('name', 'Unknown')
            
            # Get attendance count for this course
            attendance_count = len(list(db.collection('attendance')
                                      .where('student_id', '==', user['uid'])
                                      .where('course_id', '==', course_id)
                                      .stream()))
            course_data['attendance_count'] = attendance_count
            
            courses.append(course_data)
    
    # Get attendance history with course info
    attendance_records = db.collection('attendance').where('student_id', '==', user['uid']).order_by('timestamp', direction='DESCENDING').limit(20).stream()
    attendance = []
    
    for record in attendance_records:
        attendance_data = record.to_dict()
        attendance_data['id'] = record.id
        
        # Get course info
        course_doc = db.collection('courses').document(attendance_data['course_id']).get()
        if course_doc.exists:
            course_info = course_doc.to_dict()
            attendance_data['course_name'] = course_info.get('name', 'Unknown Course')
            attendance_data['course_code'] = course_info.get('code', '')
        
        attendance.append(attendance_data)
    
    return render_template('student-dashboard.html', courses=courses, attendance=attendance)

@app.route('/lecturer-dashboard')
@role_required('lecturer')
def lecturer_dashboard():
    user = session['user']
    
    # Get lecturer's courses
    courses = db.collection('courses').where('lecturer_id', '==', user['uid']).stream()
    course_list = []
    
    for course in courses:
        course_data = course.to_dict()
        course_data['id'] = course.id
        
        # Get enrollment count
        enrollment_count = len(list(db.collection('enrollments')
                                  .where('course_id', '==', course.id)
                                  .stream()))
        course_data['enrollment_count'] = enrollment_count
        
        # Get recent sessions count
        recent_sessions = len(list(db.collection('attendance_sessions')
                                 .where('course_id', '==', course.id)
                                 .where('created_at', '>=', datetime.now() - timedelta(days=30))
                                 .stream()))
        course_data['recent_sessions'] = recent_sessions
        
        course_list.append(course_data)
    
    return render_template('lecturer-dashboard.html', courses=course_list)

@app.route('/admin-dashboard')
@role_required('admin')
def admin_dashboard():
    # Get all users pending approval
    pending_users = db.collection('users').where('approved', '==', False).stream()
    pending_list = []
    
    for user in pending_users:
        user_data = user.to_dict()
        user_data['id'] = user.id
        pending_list.append(user_data)
    
    # Get all courses with stats
    courses = db.collection('courses').stream()
    course_list = []
    
    for course in courses:
        course_data = course.to_dict()
        course_data['id'] = course.id
        
        # Get lecturer name
        lecturer_doc = db.collection('users').document(course_data['lecturer_id']).get()
        if lecturer_doc.exists:
            course_data['lecturer_name'] = lecturer_doc.to_dict().get('name', 'Unknown')
        
        # Get enrollment count
        enrollment_count = len(list(db.collection('enrollments')
                                  .where('course_id', '==', course.id)
                                  .stream()))
        course_data['enrollment_count'] = enrollment_count
        
        course_list.append(course_data)
    
    # Get system stats
    total_users = len(list(db.collection('users').stream()))
    total_students = len(list(db.collection('users').where('role', '==', 'student').stream()))
    total_lecturers = len(list(db.collection('users').where('role', '==', 'lecturer').stream()))
    
    stats = {
        'total_users': total_users,
        'total_students': total_students,
        'total_lecturers': total_lecturers,
        'total_courses': len(course_list),
        'pending_approvals': len(pending_list)
    }
    
    return render_template('admin-dashboard.html', 
                         pending_users=pending_list, 
                         courses=course_list,
                         stats=stats)

@app.route('/api/mark-attendance', methods=['POST'])
@role_required('student')
def mark_attendance():
    try:
        data = request.json
        qr_data = data.get('qr_data')
        student_id = session['user']['uid']
        
        # Validate and process attendance
        result = validate_attendance(qr_data, student_id)
        
        if result['valid']:
            # Record attendance
            attendance_data = {
                'student_id': student_id,
                'course_id': result['course_id'],
                'session_id': result['session_id'],
                'timestamp': datetime.now(),
                'marked_by': 'qr_scan',
                'student_name': session['user']['name']
            }
            
            db.collection('attendance').add(attendance_data)
            
            # Get course name for response
            course_doc = db.collection('courses').document(result['course_id']).get()
            course_name = course_doc.to_dict().get('name', 'Course') if course_doc.exists else 'Course'
            
            return jsonify({
                'success': True, 
                'message': f'Attendance recorded for {course_name}!'
            })
        else:
            return jsonify({'success': False, 'message': result['message']}), 400
            
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/generate-qr', methods=['POST'])
@role_required('lecturer')
def generate_qr():
    try:
        data = request.json
        course_id = data.get('course_id')
        duration = data.get('duration', 30)  # Default 30 minutes
        
        # Verify lecturer owns this course
        course_doc = db.collection('courses').document(course_id).get()
        if not course_doc.exists or course_doc.to_dict()['lecturer_id'] != session['user']['uid']:
            return jsonify({'success': False, 'message': 'Unauthorized'}), 403
        
        # Generate QR code
        qr_result = generate_qr_code(course_id, session['user']['uid'], duration)
        
        return jsonify({
            'success': True,
            'qr_code': qr_result['qr_code'],
            'session_id': qr_result['session_id'],
            'expires_at': qr_result['expires_at'].isoformat()
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/create-course', methods=['POST'])
@role_required('lecturer')
def create_course():
    try:
        data = request.json
        course_data = {
            'name': data.get('name'),
            'code': data.get('code'),
            'description': data.get('description'),
            'lecturer_id': session['user']['uid'],
            'created_at': datetime.now()
        }
        
        course_ref = db.collection('courses').add(course_data)
        return jsonify({'success': True, 'course_id': course_ref[1].id})
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/enroll-student', methods=['POST'])
@role_required('lecturer')
def enroll_student():
    try:
        data = request.json
        course_id = data.get('course_id')
        student_email = data.get('student_email')
        
        # Verify lecturer owns this course
        course_doc = db.collection('courses').document(course_id).get()
        if not course_doc.exists or course_doc.to_dict()['lecturer_id'] != session['user']['uid']:
            return jsonify({'success': False, 'message': 'Unauthorized'}), 403
        
        # Find student by email
        students = db.collection('users').where('email', '==', student_email).where('role', '==', 'student').stream()
        student_list = list(students)
        
        if not student_list:
            return jsonify({'success': False, 'message': 'Student not found'}), 404
        
        student_id = student_list[0].id
        
        # Check if already enrolled
        existing_enrollment = db.collection('enrollments').where('student_id', '==', student_id).where('course_id', '==', course_id).stream()
        if list(existing_enrollment):
            return jsonify({'success': False, 'message': 'Student already enrolled'}), 400
        
        # Create enrollment
        enrollment_data = {
            'student_id': student_id,
            'course_id': course_id,
            'enrolled_at': datetime.now(),
            'enrolled_by': session['user']['uid']
        }
        
        db.collection('enrollments').add(enrollment_data)
        return jsonify({'success': True, 'message': 'Student enrolled successfully'})
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/live-attendance/<session_id>')
@role_required('lecturer')
def get_live_attendance(session_id):
    try:
        # Verify session belongs to lecturer
        session_doc = db.collection('attendance_sessions').document(session_id).get()
        if not session_doc.exists:
            return jsonify({'success': False, 'message': 'Session not found'}), 404
        
        session_data = session_doc.to_dict()
        if session_data['lecturer_id'] != session['user']['uid']:
            return jsonify({'success': False, 'message': 'Unauthorized'}), 403
        
        # Get attendance records for this session
        attendance_records = db.collection('attendance').where('session_id', '==', session_id).stream()
        attendance_list = []
        
        for record in attendance_records:
            record_data = record.to_dict()
            attendance_list.append({
                'student_id': record_data['student_id'],
                'student_name': record_data.get('student_name', 'Unknown'),
                'timestamp': record_data['timestamp'].isoformat() if record_data.get('timestamp') else None
            })
        
        return jsonify({
            'success': True,
            'attendance': attendance_list,
            'session_active': session_data.get('active', False)
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/course-stats/<course_id>')
@role_required('lecturer')
def get_course_stats(course_id):
    try:
        # Verify lecturer owns this course
        course_doc = db.collection('courses').document(course_id).get()
        if not course_doc.exists or course_doc.to_dict()['lecturer_id'] != session['user']['uid']:
            return jsonify({'success': False, 'message': 'Unauthorized'}), 403
        
        # Get enrollment count
        enrollments = list(db.collection('enrollments').where('course_id', '==', course_id).stream())
        enrollment_count = len(enrollments)
        
        # Get total sessions
        sessions = list(db.collection('attendance_sessions').where('course_id', '==', course_id).stream())
        session_count = len(sessions)
        
        # Get total attendance records
        attendance_records = list(db.collection('attendance').where('course_id', '==', course_id).stream())
        attendance_count = len(attendance_records)
        
        # Calculate average attendance rate
        avg_attendance_rate = 0
        if session_count > 0 and enrollment_count > 0:
            avg_attendance_rate = (attendance_count / (session_count * enrollment_count)) * 100
        
        return jsonify({
            'success': True,
            'stats': {
                'enrollment_count': enrollment_count,
                'session_count': session_count,
                'attendance_count': attendance_count,
                'avg_attendance_rate': round(avg_attendance_rate, 1)
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/enrolled-students/<course_id>')
@role_required('lecturer')
def get_enrolled_students(course_id):
    try:
        # Verify lecturer owns this course
        course_doc = db.collection('courses').document(course_id).get()
        if not course_doc.exists or course_doc.to_dict()['lecturer_id'] != session['user']['uid']:
            return jsonify({'success': False, 'message': 'Unauthorized'}), 403
        
        # Get enrolled students
        enrollments = db.collection('enrollments').where('course_id', '==', course_id).stream()
        students = []
        
        for enrollment in enrollments:
            enrollment_data = enrollment.to_dict()
            student_id = enrollment_data['student_id']
            
            # Get student details
            student_doc = db.collection('users').document(student_id).get()
            if student_doc.exists:
                student_data = student_doc.to_dict()
                
                # Get attendance count for this student in this course
                attendance_count = len(list(db.collection('attendance')
                                          .where('student_id', '==', student_id)
                                          .where('course_id', '==', course_id)
                                          .stream()))
                
                students.append({
                    'id': student_id,
                    'name': student_data.get('name', 'Unknown'),
                    'email': student_data.get('email', 'Unknown'),
                    'enrolled_at': enrollment_data.get('enrolled_at'),
                    'attendance_count': attendance_count
                })
        
        return jsonify({
            'success': True,
            'students': students
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/admin/approve-user/<user_id>', methods=['POST'])
@role_required('admin')
def approve_user(user_id):
    try:
        # Update user approval status
        user_ref = db.collection('users').document(user_id)
        user_doc = user_ref.get()
        
        if not user_doc.exists:
            return jsonify({'success': False, 'message': 'User not found'}), 404
        
        user_ref.update({
            'approved': True,
            'approved_at': datetime.now(),
            'approved_by': session['user']['uid']
        })
        
        return jsonify({'success': True, 'message': 'User approved successfully'})
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/admin/reject-user/<user_id>', methods=['DELETE'])
@role_required('admin')
def reject_user(user_id):
    try:
        # Delete user from Firestore
        user_ref = db.collection('users').document(user_id)
        user_doc = user_ref.get()
        
        if not user_doc.exists:
            return jsonify({'success': False, 'message': 'User not found'}), 404
        
        # Delete from Firebase Auth
        try:
            auth.delete_user(user_id)
        except Exception as auth_error:
            print(f"Error deleting from Firebase Auth: {auth_error}")
        
        # Delete from Firestore
        user_ref.delete()
        
        return jsonify({'success': True, 'message': 'User rejected and deleted'})
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/admin/create-user', methods=['POST'])
@role_required('admin')
def admin_create_user():
    try:
        data = request.json
        name = data.get('name')
        email = data.get('email')
        role = data.get('role')
        password = data.get('password')
        
        # Create user in Firebase Auth
        user_record = auth.create_user(
            email=email,
            password=password,
            display_name=name
        )
        
        # Create user document in Firestore
        user_data = {
            'uid': user_record.uid,
            'email': email,
            'name': name,
            'role': role,
            'created_at': datetime.now(),
            'approved': True,  # Admin-created users are auto-approved
            'created_by': session['user']['uid']
        }
        
        db.collection('users').document(user_record.uid).set(user_data)
        
        return jsonify({'success': True, 'message': 'User created successfully'})
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/admin/users')
@role_required('admin')
def get_all_users():
    try:
        users = db.collection('users').stream()
        user_list = []
        
        for user in users:
            user_data = user.to_dict()
            user_data['uid'] = user.id
            user_list.append(user_data)
        
        return jsonify({'success': True, 'users': user_list})
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/admin/user-details/<user_id>')
@role_required('admin')
def get_user_details(user_id):
    try:
        user_doc = db.collection('users').document(user_id).get()
        
        if not user_doc.exists:
            return jsonify({'success': False, 'message': 'User not found'}), 404
        
        user_data = user_doc.to_dict()
        user_data['uid'] = user_id
        
        # Get additional stats based on role
        if user_data['role'] == 'student':
            # Get enrollment and attendance stats
            enrollments = len(list(db.collection('enrollments').where('student_id', '==', user_id).stream()))
            attendance_records = len(list(db.collection('attendance').where('student_id', '==', user_id).stream()))
            user_data['enrollments'] = enrollments
            user_data['attendance_records'] = attendance_records
            
        elif user_data['role'] == 'lecturer':
            # Get course and session stats
            courses = len(list(db.collection('courses').where('lecturer_id', '==', user_id).stream()))
            sessions = len(list(db.collection('attendance_sessions').where('lecturer_id', '==', user_id).stream()))
            user_data['courses'] = courses
            user_data['sessions'] = sessions
        
        return jsonify({'success': True, 'user': user_data})
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/admin/delete-user/<user_id>', methods=['DELETE'])
@role_required('admin')
def admin_delete_user(user_id):
    try:
        # Don't allow deleting the current admin
        if user_id == session['user']['uid']:
            return jsonify({'success': False, 'message': 'Cannot delete your own account'}), 400
        
        user_doc = db.collection('users').document(user_id).get()
        if not user_doc.exists:
            return jsonify({'success': False, 'message': 'User not found'}), 404
        
        user_data = user_doc.to_dict()
        
        # Delete related data based on role
        if user_data['role'] == 'student':
            # Delete enrollments and attendance records
            enrollments = db.collection('enrollments').where('student_id', '==', user_id).stream()
            for enrollment in enrollments:
                enrollment.reference.delete()
            
            attendance_records = db.collection('attendance').where('student_id', '==', user_id).stream()
            for record in attendance_records:
                record.reference.delete()
                
        elif user_data['role'] == 'lecturer':
            # Delete courses, sessions, and related data
            courses = db.collection('courses').where('lecturer_id', '==', user_id).stream()
            for course in courses:
                course_id = course.id
                
                # Delete enrollments for this course
                enrollments = db.collection('enrollments').where('course_id', '==', course_id).stream()
                for enrollment in enrollments:
                    enrollment.reference.delete()
                
                # Delete attendance records for this course
                attendance_records = db.collection('attendance').where('course_id', '==', course_id).stream()
                for record in attendance_records:
                    record.reference.delete()
                
                # Delete sessions for this course
                sessions = db.collection('attendance_sessions').where('course_id', '==', course_id).stream()
                for session_doc in sessions:
                    session_doc.reference.delete()
                
                # Delete the course
                course.reference.delete()
        
        # Delete from Firebase Auth
        try:
            auth.delete_user(user_id)
        except Exception as auth_error:
            print(f"Error deleting from Firebase Auth: {auth_error}")
        
        # Delete user document
        db.collection('users').document(user_id).delete()
        
        return jsonify({'success': True, 'message': 'User and related data deleted successfully'})
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/admin/delete-course/<course_id>', methods=['DELETE'])
@role_required('admin')
def admin_delete_course(course_id):
    try:
        course_doc = db.collection('courses').document(course_id).get()
        if not course_doc.exists:
            return jsonify({'success': False, 'message': 'Course not found'}), 404
        
        # Delete enrollments
        enrollments = db.collection('enrollments').where('course_id', '==', course_id).stream()
        for enrollment in enrollments:
            enrollment.reference.delete()
        
        # Delete attendance records
        attendance_records = db.collection('attendance').where('course_id', '==', course_id).stream()
        for record in attendance_records:
            record.reference.delete()
        
        # Delete sessions
        sessions = db.collection('attendance_sessions').where('course_id', '==', course_id).stream()
        for session in sessions:
            session.reference.delete()
        
        # Delete the course
        db.collection('courses').document(course_id).delete()
        
        return jsonify({'success': True, 'message': 'Course and related data deleted successfully'})
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/admin/export-report')
@role_required('admin')
def export_system_report():
    try:
        # Generate system report (CSV format)
        import csv
        import io
        
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Write headers
        writer.writerow(['Report Type', 'System Overview'])
        writer.writerow(['Generated At', datetime.now().isoformat()])
        writer.writerow([])
        
        # User statistics
        writer.writerow(['User Statistics'])
        writer.writerow(['Total Users', len(list(db.collection('users').stream()))])
        writer.writerow(['Students', len(list(db.collection('users').where('role', '==', 'student').stream()))])
        writer.writerow(['Lecturers', len(list(db.collection('users').where('role', '==', 'lecturer').stream()))])
        writer.writerow(['Admins', len(list(db.collection('users').where('role', '==', 'admin').stream()))])
        writer.writerow([])
        
        # Course statistics
        writer.writerow(['Course Statistics'])
        writer.writerow(['Total Courses', len(list(db.collection('courses').stream()))])
        writer.writerow(['Total Enrollments', len(list(db.collection('enrollments').stream()))])
        writer.writerow(['Total Attendance Records', len(list(db.collection('attendance').stream()))])
        
        # Create response
        from flask import Response
        output.seek(0)
        return Response(
            output.getvalue(),
            mimetype='text/csv',
            headers={'Content-Disposition': 'attachment; filename=system_report.csv'}
        )
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

# Analytics and Reports API endpoints

@app.route('/api/analytics/student/<student_id>')
@login_required
def get_student_analytics(student_id):
    """Get analytics for a student"""
    try:
        # Check permissions
        if session['user']['role'] == 'student' and session['user']['uid'] != student_id:
            return jsonify({'success': False, 'message': 'Unauthorized'}), 403
        
        course_id = request.args.get('course_id')
        days = int(request.args.get('days', 30))
        
        analytics_data = analytics.get_student_analytics(student_id, course_id, days)
        
        if analytics_data:
            return jsonify({'success': True, 'analytics': analytics_data})
        else:
            return jsonify({'success': False, 'message': 'Failed to get analytics'}), 500
            
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/analytics/course/<course_id>')
@login_required
def get_course_analytics(course_id):
    """Get analytics for a course"""
    try:
        lecturer_id = None
        
        # Check permissions
        if session['user']['role'] == 'lecturer':
            lecturer_id = session['user']['uid']
        elif session['user']['role'] != 'admin':
            return jsonify({'success': False, 'message': 'Unauthorized'}), 403
        
        days = int(request.args.get('days', 30))
        
        analytics_data = analytics.get_course_analytics(course_id, lecturer_id, days)
        
        if analytics_data:
            return jsonify({'success': True, 'analytics': analytics_data})
        else:
            return jsonify({'success': False, 'message': 'Failed to get analytics'}), 500
            
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/analytics/system')
@role_required('admin')
def get_system_analytics():
    """Get system-wide analytics"""
    try:
        days = int(request.args.get('days', 30))
        
        analytics_data = analytics.get_system_analytics(days)
        
        if analytics_data:
            return jsonify({'success': True, 'analytics': analytics_data})
        else:
            return jsonify({'success': False, 'message': 'Failed to get analytics'}), 500
            
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/reports/student/<student_id>')
@login_required
def generate_student_report_api(student_id):
    """Generate student report"""
    try:
        # Check permissions
        if session['user']['role'] == 'student' and session['user']['uid'] != student_id:
            return jsonify({'success': False, 'message': 'Unauthorized'}), 403
        
        format_type = request.args.get('format', 'csv')
        
        report = report_generator.generate_student_report(student_id, format_type)
        
        if report:
            return report
        else:
            return jsonify({'success': False, 'message': 'Failed to generate report'}), 500
            
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/reports/course/<course_id>')
@login_required
def generate_course_report_api(course_id):
    """Generate course report"""
    try:
        lecturer_id = None
        
        # Check permissions
        if session['user']['role'] == 'lecturer':
            lecturer_id = session['user']['uid']
        elif session['user']['role'] != 'admin':
            return jsonify({'success': False, 'message': 'Unauthorized'}), 403
        
        format_type = request.args.get('format', 'csv')
        
        report = report_generator.generate_course_report(course_id, lecturer_id, format_type)
        
        if report:
            return report
        else:
            return jsonify({'success': False, 'message': 'Failed to generate report'}), 500
            
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/reports/system')
@role_required('admin')
def generate_system_report_api():
    """Generate system report"""
    try:
        format_type = request.args.get('format', 'csv')
        
        report = report_generator.generate_system_report(format_type)
        
        if report:
            return report
        else:
            return jsonify({'success': False, 'message': 'Failed to generate report'}), 500
            
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

# Enhanced dashboard routes with analytics

@app.route('/analytics')
@login_required
def analytics_dashboard():
    """Analytics dashboard page"""
    user_role = session['user']['role']
    
    if user_role == 'admin':
        return render_template('analytics/admin_analytics.html')
    elif user_role == 'lecturer':
        return render_template('analytics/lecturer_analytics.html')
    else:
        return render_template('analytics/student_analytics.html')

@app.route('/reports')
@login_required
def reports_dashboard():
    """Reports dashboard page"""
    user_role = session['user']['role']
    
    if user_role == 'admin':
        return render_template('reports/admin_reports.html')
    elif user_role == 'lecturer':
        return render_template('reports/lecturer_reports.html')
    else:
        return render_template('reports/student_reports.html')
