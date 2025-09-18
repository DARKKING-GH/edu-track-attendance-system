from datetime import datetime, timedelta
from collections import defaultdict
import json
from app import db

class AttendanceAnalytics:
    """Analytics engine for attendance data"""
    
    def __init__(self):
        self.db = db
    
    def get_student_analytics(self, student_id, course_id=None, days=30):
        """Get analytics for a specific student"""
        try:
            # Base query
            query = self.db.collection('attendance').where('student_id', '==', student_id)
            
            # Add course filter if specified
            if course_id:
                query = query.where('course_id', '==', course_id)
            
            # Get attendance records
            attendance_records = list(query.stream())
            
            # Filter by date range
            cutoff_date = datetime.now() - timedelta(days=days)
            recent_records = [
                record for record in attendance_records 
                if record.to_dict().get('timestamp', datetime.min) >= cutoff_date
            ]
            
            # Calculate metrics
            total_sessions = self._get_total_sessions(course_id, days) if course_id else None
            attendance_rate = (len(recent_records) / total_sessions * 100) if total_sessions else 0
            
            # Weekly breakdown
            weekly_data = self._get_weekly_breakdown(recent_records)
            
            # Course breakdown
            course_breakdown = self._get_course_breakdown(attendance_records)
            
            return {
                'total_attendance': len(recent_records),
                'attendance_rate': round(attendance_rate, 1),
                'weekly_data': weekly_data,
                'course_breakdown': course_breakdown,
                'trend': self._calculate_trend(recent_records)
            }
            
        except Exception as e:
            print(f"Error in get_student_analytics: {e}")
            return None
    
    def get_course_analytics(self, course_id, lecturer_id=None, days=30):
        """Get analytics for a specific course"""
        try:
            # Verify lecturer owns course if specified
            if lecturer_id:
                course_doc = self.db.collection('courses').document(course_id).get()
                if not course_doc.exists or course_doc.to_dict()['lecturer_id'] != lecturer_id:
                    return None
            
            # Get course info
            course_doc = self.db.collection('courses').document(course_id).get()
            if not course_doc.exists:
                return None
            
            course_data = course_doc.to_dict()
            
            # Get enrollments
            enrollments = list(self.db.collection('enrollments').where('course_id', '==', course_id).stream())
            total_students = len(enrollments)
            
            # Get attendance records
            cutoff_date = datetime.now() - timedelta(days=days)
            attendance_records = list(
                self.db.collection('attendance')
                .where('course_id', '==', course_id)
                .where('timestamp', '>=', cutoff_date)
                .stream()
            )
            
            # Get sessions
            sessions = list(
                self.db.collection('attendance_sessions')
                .where('course_id', '==', course_id)
                .where('created_at', '>=', cutoff_date)
                .stream()
            )
            
            total_sessions = len(sessions)
            
            # Calculate metrics
            total_attendance = len(attendance_records)
            avg_attendance_rate = (total_attendance / (total_sessions * total_students) * 100) if (total_sessions and total_students) else 0
            
            # Session breakdown
            session_breakdown = self._get_session_breakdown(attendance_records, sessions)
            
            # Student performance
            student_performance = self._get_student_performance(course_id, enrollments, attendance_records)
            
            # Daily trends
            daily_trends = self._get_daily_trends(attendance_records)
            
            return {
                'course_name': course_data.get('name', 'Unknown'),
                'course_code': course_data.get('code', ''),
                'total_students': total_students,
                'total_sessions': total_sessions,
                'total_attendance': total_attendance,
                'avg_attendance_rate': round(avg_attendance_rate, 1),
                'session_breakdown': session_breakdown,
                'student_performance': student_performance,
                'daily_trends': daily_trends
            }
            
        except Exception as e:
            print(f"Error in get_course_analytics: {e}")
            return None
    
    def get_system_analytics(self, days=30):
        """Get system-wide analytics"""
        try:
            cutoff_date = datetime.now() - timedelta(days=days)
            
            # Get all collections data
            users = list(self.db.collection('users').stream())
            courses = list(self.db.collection('courses').stream())
            enrollments = list(self.db.collection('enrollments').stream())
            attendance_records = list(
                self.db.collection('attendance')
                .where('timestamp', '>=', cutoff_date)
                .stream()
            )
            sessions = list(
                self.db.collection('attendance_sessions')
                .where('created_at', '>=', cutoff_date)
                .stream()
            )
            
            # User statistics
            user_stats = {
                'total': len(users),
                'students': len([u for u in users if u.to_dict().get('role') == 'student']),
                'lecturers': len([u for u in users if u.to_dict().get('role') == 'lecturer']),
                'admins': len([u for u in users if u.to_dict().get('role') == 'admin'])
            }
            
            # Course statistics
            course_stats = {
                'total': len(courses),
                'total_enrollments': len(enrollments),
                'avg_enrollment_per_course': len(enrollments) / len(courses) if courses else 0
            }
            
            # Attendance statistics
            attendance_stats = {
                'total_sessions': len(sessions),
                'total_attendance': len(attendance_records),
                'avg_attendance_per_session': len(attendance_records) / len(sessions) if sessions else 0
            }
            
            # Activity trends
            activity_trends = self._get_system_activity_trends(attendance_records, sessions)
            
            # Top performing courses
            top_courses = self._get_top_performing_courses(days)
            
            return {
                'user_stats': user_stats,
                'course_stats': course_stats,
                'attendance_stats': attendance_stats,
                'activity_trends': activity_trends,
                'top_courses': top_courses
            }
            
        except Exception as e:
            print(f"Error in get_system_analytics: {e}")
            return None
    
    def _get_total_sessions(self, course_id, days):
        """Get total sessions for a course in the given period"""
        cutoff_date = datetime.now() - timedelta(days=days)
        sessions = list(
            self.db.collection('attendance_sessions')
            .where('course_id', '==', course_id)
            .where('created_at', '>=', cutoff_date)
            .stream()
        )
        return len(sessions)
    
    def _get_weekly_breakdown(self, attendance_records):
        """Get weekly attendance breakdown"""
        weekly_data = defaultdict(int)
        
        for record in attendance_records:
            record_data = record.to_dict()
            timestamp = record_data.get('timestamp')
            if timestamp:
                week_start = timestamp - timedelta(days=timestamp.weekday())
                week_key = week_start.strftime('%Y-%m-%d')
                weekly_data[week_key] += 1
        
        # Convert to list format for charts
        return [
            {'week': week, 'count': count}
            for week, count in sorted(weekly_data.items())
        ]
    
    def _get_course_breakdown(self, attendance_records):
        """Get attendance breakdown by course"""
        course_data = defaultdict(int)
        
        for record in attendance_records:
            record_data = record.to_dict()
            course_id = record_data.get('course_id')
            if course_id:
                course_data[course_id] += 1
        
        # Get course names
        breakdown = []
        for course_id, count in course_data.items():
            course_doc = self.db.collection('courses').document(course_id).get()
            course_name = course_doc.to_dict().get('name', 'Unknown') if course_doc.exists else 'Unknown'
            breakdown.append({
                'course_id': course_id,
                'course_name': course_name,
                'count': count
            })
        
        return sorted(breakdown, key=lambda x: x['count'], reverse=True)
    
    def _calculate_trend(self, attendance_records):
        """Calculate attendance trend (increasing/decreasing)"""
        if len(attendance_records) < 2:
            return 'stable'
        
        # Sort by timestamp
        sorted_records = sorted(
            attendance_records,
            key=lambda x: x.to_dict().get('timestamp', datetime.min)
        )
        
        # Compare first and second half
        mid_point = len(sorted_records) // 2
        first_half = len(sorted_records[:mid_point])
        second_half = len(sorted_records[mid_point:])
        
        if second_half > first_half * 1.1:
            return 'increasing'
        elif second_half < first_half * 0.9:
            return 'decreasing'
        else:
            return 'stable'
    
    def _get_session_breakdown(self, attendance_records, sessions):
        """Get breakdown of attendance by session"""
        session_data = {}
        
        # Initialize session data
        for session in sessions:
            session_data[session.id] = {
                'session_id': session.id,
                'created_at': session.to_dict().get('created_at'),
                'attendance_count': 0
            }
        
        # Count attendance per session
        for record in attendance_records:
            session_id = record.to_dict().get('session_id')
            if session_id in session_data:
                session_data[session_id]['attendance_count'] += 1
        
        return list(session_data.values())
    
    def _get_student_performance(self, course_id, enrollments, attendance_records):
        """Get individual student performance in a course"""
        student_data = {}
        
        # Initialize student data
        for enrollment in enrollments:
            student_id = enrollment.to_dict()['student_id']
            student_doc = self.db.collection('users').document(student_id).get()
            student_name = student_doc.to_dict().get('name', 'Unknown') if student_doc.exists else 'Unknown'
            
            student_data[student_id] = {
                'student_id': student_id,
                'student_name': student_name,
                'attendance_count': 0
            }
        
        # Count attendance per student
        for record in attendance_records:
            student_id = record.to_dict().get('student_id')
            if student_id in student_data:
                student_data[student_id]['attendance_count'] += 1
        
        # Sort by attendance count
        return sorted(
            student_data.values(),
            key=lambda x: x['attendance_count'],
            reverse=True
        )
    
    def _get_daily_trends(self, attendance_records):
        """Get daily attendance trends"""
        daily_data = defaultdict(int)
        
        for record in attendance_records:
            record_data = record.to_dict()
            timestamp = record_data.get('timestamp')
            if timestamp:
                date_key = timestamp.strftime('%Y-%m-%d')
                daily_data[date_key] += 1
        
        return [
            {'date': date, 'count': count}
            for date, count in sorted(daily_data.items())
        ]
    
    def _get_system_activity_trends(self, attendance_records, sessions):
        """Get system-wide activity trends"""
        daily_attendance = defaultdict(int)
        daily_sessions = defaultdict(int)
        
        # Count daily attendance
        for record in attendance_records:
            record_data = record.to_dict()
            timestamp = record_data.get('timestamp')
            if timestamp:
                date_key = timestamp.strftime('%Y-%m-%d')
                daily_attendance[date_key] += 1
        
        # Count daily sessions
        for session in sessions:
            session_data = session.to_dict()
            timestamp = session_data.get('created_at')
            if timestamp:
                date_key = timestamp.strftime('%Y-%m-%d')
                daily_sessions[date_key] += 1
        
        # Combine data
        all_dates = set(daily_attendance.keys()) | set(daily_sessions.keys())
        trends = []
        
        for date in sorted(all_dates):
            trends.append({
                'date': date,
                'attendance': daily_attendance[date],
                'sessions': daily_sessions[date]
            })
        
        return trends
    
    def _get_top_performing_courses(self, days=30):
        """Get top performing courses by attendance rate"""
        cutoff_date = datetime.now() - timedelta(days=days)
        courses = list(self.db.collection('courses').stream())
        
        course_performance = []
        
        for course in courses:
            course_id = course.id
            course_data = course.to_dict()
            
            # Get enrollments
            enrollments = len(list(
                self.db.collection('enrollments')
                .where('course_id', '==', course_id)
                .stream()
            ))
            
            # Get sessions
            sessions = len(list(
                self.db.collection('attendance_sessions')
                .where('course_id', '==', course_id)
                .where('created_at', '>=', cutoff_date)
                .stream()
            ))
            
            # Get attendance
            attendance = len(list(
                self.db.collection('attendance')
                .where('course_id', '==', course_id)
                .where('timestamp', '>=', cutoff_date)
                .stream()
            ))
            
            # Calculate rate
            attendance_rate = (attendance / (sessions * enrollments) * 100) if (sessions and enrollments) else 0
            
            course_performance.append({
                'course_id': course_id,
                'course_name': course_data.get('name', 'Unknown'),
                'course_code': course_data.get('code', ''),
                'attendance_rate': round(attendance_rate, 1),
                'total_students': enrollments,
                'total_sessions': sessions,
                'total_attendance': attendance
            })
        
        # Sort by attendance rate
        return sorted(course_performance, key=lambda x: x['attendance_rate'], reverse=True)[:10]

# Global analytics instance
analytics = AttendanceAnalytics()
