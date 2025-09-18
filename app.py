from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from functools import wraps
import firebase_admin
from firebase_admin import credentials, firestore, auth, storage
import os
from datetime import datetime, timedelta
import qrcode
import io
import base64
import uuid

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'your-secret-key-here')

# Initialize Firebase Admin SDK
cred = credentials.Certificate('firebase-service-account.json')
firebase_admin.initialize_app(cred, {
    'storageBucket': 'your-project-id.appspot.com'
})

db = firestore.client()
bucket = storage.bucket()

# Import routes
from routes import *
from auth import *

if __name__ == '__main__':
    app.run(debug=True)
