import csv
import io
from datetime import datetime, timedelta
from flask import Response
from analytics import analytics
from app import db

class ReportGenerator:
    """Generate various types of reports"""
    
    def __init__(self):
        self.analytics = analytics
        self.db = db
    
    def generate_student_report(self, student_id, format='csv'):
        """Generate comprehensive student attendance report"""
        try:
            # Get student info
            student_doc = self.db.collection('users').document(student_id).get()
            if not student_doc.exists:
                return None
            
            student_data = student_doc.to_dict()
            
            # Get analytics
            analytics_data = self.analytics.get_student_analytics(student_id, days=90)
            
            # Get detailed attendance records
            attendance_records = list(
                self.db.collection('attendance')
                .where('student_id', '==', student_id)
                .order_by('timestamp', direction='DESCENDING')
                .stream()
            )
            
            if format == 'csv':
                return self._generate_student_csv(student_data, analytics_data, attendance_records)
            elif format == 'json':
                return self._generate_student_json(student_data, analytics_data, attendance_records)
            
        except Exception as e:
            print(f"Error generating student report: {e}")
            return None
    
    def generate_course_report(self, course_id, lecturer_id=None, format='csv'):
        """Generate comprehensive course attendance report"""
        try:
            # Verify access
            course_doc = self.db.collection('courses').document(course_id).get()
            if not course_doc.exists:
                return None
            
            course_data = course_doc.to_dict()
            
            if lecturer_id and course_data['lecturer_id'] != lecturer_id:
                return None
            
            # Get analytics
            analytics_data = self.analytics.get_course_analytics(course_id, lecturer_id, days=90)
            
            # Get detailed data
            enrollments = list(self.db.collection('enrollments').where('course_id', '==', course_id).stream())
            attendance_records = list(
                self.db.collection('attendance')
                .where('course_id', '==', course_id)
                .order_by('timestamp', direction='DESCENDING')
                .stream()
            )
            sessions = list(
                self.db.collection('attendance_sessions')
                .where('course_id', '==', course_id)
                .order_by('created_at', direction='DESCENDING')
                .stream()
            )
            
            if format == 'csv':
                return self._generate_course_csv(course_data, analytics_data, enrollments, attendance_records, sessions)
            elif format == 'json':
                return self._generate_course_json(course_data, analytics_data, enrollments, attendance_records, sessions)
            
        except Exception as e:
            print(f"Error generating course report: {e}")
            return None
    
    def generate_system_report(self, format='csv'):
        """Generate system-wide report"""
        try:
            # Get analytics
            analytics_data = self.analytics.get_system_analytics(days=90)
            
            # Get detailed data
            users = list(self.db.collection('users').stream())
            courses = list(self.db.collection('courses').stream())
            
            if format == 'csv':
                return self._generate_system_csv(analytics_data, users, courses)
            elif format == 'json':
                return self._generate_system_json(analytics_data, users, courses)
            
        except Exception as e:
            print(f"Error generating system report: {e}")
            return None
    
    def _generate_student_csv(self, student_data, analytics_data, attendance_records):
        """Generate CSV report for student"""
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Header information
        writer.writerow(['Student Attendance Report'])
        writer.writerow(['Generated:', datetime.now().strftime('%Y-%m-%d %H:%M:%S')])
        writer.writerow(['Student:', student_data.get('name', 'Unknown')])
        writer.writerow(['Email:', student_data.get('email', 'Unknown')])
        writer.writerow([])
        
        # Summary statistics
        if analytics_data:
            writer.writerow(['Summary Statistics'])
            writer.writerow(['Total Attendance Records:', analytics_data['total_attendance']])
            writer.writerow(['Attendance Rate:', f"{analytics_data['attendance_rate']}%"])
            writer.writerow(['Trend:', analytics_data['trend']])
            writer.writerow([])
        
        # Detailed attendance records
        writer.writerow(['Detailed Attendance Records'])
        writer.writerow(['Date', 'Time', 'Course', 'Session ID', 'Method'])
        
        for record in attendance_records:
            record_data = record.to_dict()
            timestamp = record_data.get('timestamp')
            
            # Get course name
            course_doc = self.db.collection('courses').document(record_data.get('course_id', '')).get()
            course_name = course_doc.to_dict().get('name', 'Unknown') if course_doc.exists else 'Unknown'
            
            writer.writerow([
                timestamp.strftime('%Y-%m-%d') if timestamp else 'N/A',
                timestamp.strftime('%H:%M:%S') if timestamp else 'N/A',
                course_name,
                record_data.get('session_id', 'N/A'),
                record_data.get('marked_by', 'N/A')
            ])
        
        output.seek(0)
        return Response(
            output.getvalue(),
            mimetype='text/csv',
            headers={'Content-Disposition': f'attachment; filename=student_report_{student_data.get("name", "unknown")}.csv'}
        )
    
    def _generate_course_csv(self, course_data, analytics_data, enrollments, attendance_records, sessions):
        """Generate CSV report for course"""
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Header information
        writer.writerow(['Course Attendance Report'])
        writer.writerow(['Generated:', datetime.now().strftime('%Y-%m-%d %H:%M:%S')])
        writer.writerow(['Course:', course_data.get('name', 'Unknown')])
        writer.writerow(['Code:', course_data.get('code', 'Unknown')])
        writer.writerow([])
        
        # Summary statistics
        if analytics_data:
            writer.writerow(['Summary Statistics'])
            writer.writerow(['Total Students:', analytics_data['total_students']])
            writer.writerow(['Total Sessions:', analytics_data['total_sessions']])
            writer.writerow(['Total Attendance:', analytics_data['total_attendance']])
            writer.writerow(['Average Attendance Rate:', f"{analytics_data['avg_attendance_rate']}%"])
            writer.writerow([])
        
        # Student performance
        if analytics_data and analytics_data['student_performance']:
            writer.writerow(['Student Performance'])
            writer.writerow(['Student Name', 'Attendance Count', 'Attendance Rate'])
            
            total_sessions = analytics_data['total_sessions']
            for student in analytics_data['student_performance']:
                attendance_rate = (student['attendance_count'] / total_sessions * 100) if total_sessions else 0
                writer.writerow([
                    student['student_name'],
                    student['attendance_count'],
                    f"{attendance_rate:.1f}%"
                ])
            writer.writerow([])
        
        # Session breakdown
        writer.writerow(['Session Details'])
        writer.writerow(['Session ID', 'Date', 'Time', 'Attendance Count'])
        
        for session in sessions:
            session_data = session.to_dict()
            created_at = session_data.get('created_at')
            
            # Count attendance for this session
            session_attendance = len([
                r for r in attendance_records 
                if r.to_dict().get('session_id') == session.id
            ])
            
            writer.writerow([
                session.id,
                created_at.strftime('%Y-%m-%d') if created_at else 'N/A',
                created_at.strftime('%H:%M:%S') if created_at else 'N/A',
                session_attendance
            ])
        
        output.seek(0)
        return Response(
            output.getvalue(),
            mimetype='text/csv',
            headers={'Content-Disposition': f'attachment; filename=course_report_{course_data.get("code", "unknown")}.csv'}
        )
    
    def _generate_system_csv(self, analytics_data, users, courses):
        """Generate CSV report for entire system"""
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Header information
        writer.writerow(['System Report'])
        writer.writerow(['Generated:', datetime.now().strftime('%Y-%m-%d %H:%M:%S')])
        writer.writerow([])
        
        # System statistics
        if analytics_data:
            writer.writerow(['User Statistics'])
            writer.writerow(['Total Users:', analytics_data['user_stats']['total']])
            writer.writerow(['Students:', analytics_data['user_stats']['students']])
            writer.writerow(['Lecturers:', analytics_data['user_stats']['lecturers']])
            writer.writerow(['Admins:', analytics_data['user_stats']['admins']])
            writer.writerow([])
            
            writer.writerow(['Course Statistics'])
            writer.writerow(['Total Courses:', analytics_data['course_stats']['total']])
            writer.writerow(['Total Enrollments:', analytics_data['course_stats']['total_enrollments']])
            writer.writerow(['Avg Enrollment per Course:', f"{analytics_data['course_stats']['avg_enrollment_per_course']:.1f}"])
            writer.writerow([])
            
            writer.writerow(['Attendance Statistics'])
            writer.writerow(['Total Sessions:', analytics_data['attendance_stats']['total_sessions']])
            writer.writerow(['Total Attendance:', analytics_data['attendance_stats']['total_attendance']])
            writer.writerow(['Avg Attendance per Session:', f"{analytics_data['attendance_stats']['avg_attendance_per_session']:.1f}"])
            writer.writerow([])
        
        # Top performing courses
        if analytics_data and analytics_data['top_courses']:
            writer.writerow(['Top Performing Courses'])
            writer.writerow(['Course Name', 'Code', 'Attendance Rate', 'Students', 'Sessions'])
            
            for course in analytics_data['top_courses']:
                writer.writerow([
                    course['course_name'],
                    course['course_code'],
                    f"{course['attendance_rate']}%",
                    course['total_students'],
                    course['total_sessions']
                ])
        
        output.seek(0)
        return Response(
            output.getvalue(),
            mimetype='text/csv',
            headers={'Content-Disposition': 'attachment; filename=system_report.csv'}
        )
    
    def _generate_student_json(self, student_data, analytics_data, attendance_records):
        """Generate JSON report for student"""
        # Convert attendance records to serializable format
        attendance_list = []
        for record in attendance_records:
            record_data = record.to_dict()
            
            # Get course name
            course_doc = self.db.collection('courses').document(record_data.get('course_id', '')).get()
            course_name = course_doc.to_dict().get('name', 'Unknown') if course_doc.exists else 'Unknown'
            
            attendance_list.append({
                'date': record_data.get('timestamp').isoformat() if record_data.get('timestamp') else None,
                'course_id': record_data.get('course_id'),
                'course_name': course_name,
                'session_id': record_data.get('session_id'),
                'method': record_data.get('marked_by')
            })
        
        report_data = {
            'report_type': 'student_attendance',
            'generated_at': datetime.now().isoformat(),
            'student_info': {
                'name': student_data.get('name'),
                'email': student_data.get('email'),
                'id': student_data.get('uid')
            },
            'analytics': analytics_data,
            'attendance_records': attendance_list
        }
        
        return Response(
            json.dumps(report_data, indent=2),
            mimetype='application/json',
            headers={'Content-Disposition': f'attachment; filename=student_report_{student_data.get("name", "unknown")}.json'}
        )
    
    def _generate_course_json(self, course_data, analytics_data, enrollments, attendance_records, sessions):
        """Generate JSON report for course"""
        # Convert data to serializable format
        enrollment_list = []
        for enrollment in enrollments:
            enrollment_data = enrollment.to_dict()
            student_doc = self.db.collection('users').document(enrollment_data['student_id']).get()
            student_name = student_doc.to_dict().get('name', 'Unknown') if student_doc.exists else 'Unknown'
            
            enrollment_list.append({
                'student_id': enrollment_data['student_id'],
                'student_name': student_name,
                'enrolled_at': enrollment_data.get('enrolled_at').isoformat() if enrollment_data.get('enrolled_at') else None
            })
        
        attendance_list = []
        for record in attendance_records:
            record_data = record.to_dict()
            attendance_list.append({
                'student_id': record_data.get('student_id'),
                'student_name': record_data.get('student_name'),
                'session_id': record_data.get('session_id'),
                'timestamp': record_data.get('timestamp').isoformat() if record_data.get('timestamp') else None,
                'method': record_data.get('marked_by')
            })
        
        session_list = []
        for session in sessions:
            session_data = session.to_dict()
            session_list.append({
                'session_id': session.id,
                'created_at': session_data.get('created_at').isoformat() if session_data.get('created_at') else None,
                'expires_at': session_data.get('expires_at').isoformat() if session_data.get('expires_at') else None,
                'active': session_data.get('active', False)
            })
        
        report_data = {
            'report_type': 'course_attendance',
            'generated_at': datetime.now().isoformat(),
            'course_info': {
                'name': course_data.get('name'),
                'code': course_data.get('code'),
                'description': course_data.get('description'),
                'lecturer_id': course_data.get('lecturer_id')
            },
            'analytics': analytics_data,
            'enrollments': enrollment_list,
            'attendance_records': attendance_list,
            'sessions': session_list
        }
        
        return Response(
            json.dumps(report_data, indent=2),
            mimetype='application/json',
            headers={'Content-Disposition': f'attachment; filename=course_report_{course_data.get("code", "unknown")}.json'}
        )
    
    def _generate_system_json(self, analytics_data, users, courses):
        """Generate JSON report for entire system"""
        # Convert data to serializable format
        user_list = []
        for user in users:
            user_data = user.to_dict()
            user_list.append({
                'id': user.id,
                'name': user_data.get('name'),
                'email': user_data.get('email'),
                'role': user_data.get('role'),
                'approved': user_data.get('approved'),
                'created_at': user_data.get('created_at').isoformat() if user_data.get('created_at') else None,
                'last_login': user_data.get('last_login').isoformat() if user_data.get('last_login') else None
            })
        
        course_list = []
        for course in courses:
            course_data = course.to_dict()
            course_list.append({
                'id': course.id,
                'name': course_data.get('name'),
                'code': course_data.get('code'),
                'description': course_data.get('description'),
                'lecturer_id': course_data.get('lecturer_id'),
                'created_at': course_data.get('created_at').isoformat() if course_data.get('created_at') else None
            })
        
        report_data = {
            'report_type': 'system_overview',
            'generated_at': datetime.now().isoformat(),
            'analytics': analytics_data,
            'users': user_list,
            'courses': course_list
        }
        
        return Response(
            json.dumps(report_data, indent=2),
            mimetype='application/json',
            headers={'Content-Disposition': 'attachment; filename=system_report.json'}
        )

# Global report generator instance
report_generator = ReportGenerator()
