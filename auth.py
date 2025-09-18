from flask import request, jsonify, session, redirect, url_for, render_template
from firebase_admin import auth
from functools import wraps
from app import app, db
from datetime import datetime

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

def role_required(required_role):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if 'user' not in session:
                return redirect(url_for('login'))
            
            user_role = session['user'].get('role', 'student')
            
            # Check if user is approved (for lecturers)
            if user_role == 'lecturer' and not session['user'].get('approved', False):
                return render_template('pending_approval.html'), 403
            
            if user_role != required_role and required_role != 'any':
                return jsonify({'error': 'Unauthorized access'}), 403
            return f(*args, **kwargs)
        return decorated_function
    return decorator

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        try:
            # Get the ID token from the client
            id_token = request.json.get('idToken')
            
            # Verify the ID token
            decoded_token = auth.verify_id_token(id_token)
            uid = decoded_token['uid']
            
            # Get user data from Firestore
            user_ref = db.collection('users').document(uid)
            user_doc = user_ref.get()
            
            if user_doc.exists:
                user_data = user_doc.to_dict()
                
                # Check if lecturer is approved
                if user_data.get('role') == 'lecturer' and not user_data.get('approved', False):
                    return jsonify({'error': 'Your account is pending admin approval'}), 403
                
                session['user'] = {
                    'uid': uid,
                    'email': user_data.get('email'),
                    'role': user_data.get('role', 'student'),
                    'name': user_data.get('name'),
                    'approved': user_data.get('approved', True)
                }
                
                # Update last login
                user_ref.update({'last_login': datetime.now()})
                
                return jsonify({'success': True, 'role': user_data.get('role', 'student')})
            else:
                return jsonify({'error': 'User not found in database'}), 404
                
        except Exception as e:
            return jsonify({'error': str(e)}), 400
    
    return render_template('login.html')

@app.route('/signup', methods=['GET', 'POST'])
def signup():
    if request.method == 'POST':
        try:
            data = request.json
            id_token = data.get('idToken')
            role = data.get('role', 'student')
            name = data.get('name')
            
            # Verify the ID token
            decoded_token = auth.verify_id_token(id_token)
            uid = decoded_token['uid']
            email = decoded_token.get('email')
            
            # Check if user already exists
            existing_user = db.collection('users').document(uid).get()
            if existing_user.exists:
                return jsonify({'error': 'User already exists'}), 400
            
            # Create user document in Firestore
            user_data = {
                'uid': uid,
                'email': email,
                'name': name,
                'role': role,
                'created_at': datetime.now(),
                'approved': role == 'student',  # Students auto-approved, lecturers need admin approval
                'last_login': datetime.now()
            }
            
            db.collection('users').document(uid).set(user_data)
            
            # Only create session if approved
            if user_data['approved']:
                session['user'] = {
                    'uid': uid,
                    'email': email,
                    'role': role,
                    'name': name,
                    'approved': True
                }
            
            return jsonify({'success': True, 'role': role, 'approved': user_data['approved']})
            
        except Exception as e:
            return jsonify({'error': str(e)}), 400
    
    return render_template('signup.html')

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

@app.route('/pending-approval')
def pending_approval():
    return render_template('pending_approval.html')
