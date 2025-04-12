import os
import re
import traceback
from datetime import datetime, timezone
from flask import Flask, send_from_directory, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash

# --- App Initialization ---
# Point static_folder to './static' which contains the SvelteKit build output
app = Flask(__name__, static_folder='static')

# --- Configuration ---
# Secret key is crucial for sessions and security (change this in production!)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'a_very_dev_secret_key_change_me_ts_final')

# Database configuration (SQLite in the instance folder)
basedir = os.path.abspath(os.path.dirname(__file__))
# Ensure instance folder exists
instance_path = os.path.join(basedir, 'instance')
os.makedirs(instance_path, exist_ok=True)
# Ensure scenario DBs folder exists
scenario_db_path = os.path.join(instance_path, 'scenario_dbs')
os.makedirs(scenario_db_path, exist_ok=True)

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(instance_path, 'users.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False # Disable modification tracking overhead

# --- Database Setup ---
db = SQLAlchemy(app)

# --- Login Manager Setup ---
login_manager = LoginManager()
login_manager.init_app(app)
# For APIs, we don't want automatic redirection. We handle unauthorized access in the endpoints.
# login_manager.login_view = 'login' # Not needed for SPA/API setup

# --- Database Models ---
class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256)) # Increased length for potentially longer hashes

    # Define relationship to Progress
    # cascade="all, delete-orphan" means if a user is deleted, their progress is also deleted.
    progress = db.relationship('Progress', backref='user', lazy=True, cascade="all, delete-orphan")

    def set_password(self, password):
        # Hash the password using a strong method like pbkdf2:sha256
        self.password_hash = generate_password_hash(password, method='pbkdf2:sha256')

    def check_password(self, password):
        # Check password hash, handle case where hash might not exist yet
        if not self.password_hash:
             return False
        return check_password_hash(self.password_hash, password)

    def __repr__(self):
        return f'<User {self.username}>'

class Progress(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    # Added ondelete='CASCADE' to the ForeignKey for database-level cascade deletes
    user_id = db.Column(db.Integer, db.ForeignKey('user.id', ondelete='CASCADE'), nullable=False)
    scenario_id = db.Column(db.String(100), nullable=False) # e.g., 'black-pearl', 'jungle-ledger'
    level_id = db.Column(db.String(100), nullable=False) # e.g., 'bp-1', 'bp-2'
    # Use timezone=True for timezone-aware datetime objects
    completed_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Ensure a user can only complete a specific level once
    __table_args__ = (db.UniqueConstraint('user_id', 'scenario_id', 'level_id', name='_user_scenario_level_uc'),)

    def __repr__(self):
         return f'<Progress user={self.user_id} level={self.scenario_id}/{self.level_id}>'


# --- User Loader for Flask-Login ---
# This callback is used to reload the user object from the user ID stored in the session
@login_manager.user_loader
def load_user(user_id):
    # Since the user ID is just the primary key of our user table, use it directly.
    # Return None if the ID is invalid so Flask-Login handles it gracefully.
    try:
        # Use .get which is optimized for primary key lookups
        return User.query.get(int(user_id))
    except (TypeError, ValueError):
         # Handle cases where user_id isn't a valid integer
        return None

# --- Static File Serving Routes (From SvelteKit Build) ---

# Serves the main index.html from the static folder (root of the SvelteKit build)
@app.route('/')
def serve_index():
    return send_from_directory(app.static_folder, 'index.html')

# Serves files from the _app directory (SvelteKit's JS/CSS chunks)
@app.route('/_app/<path:subpath>')
def serve_sk_app(subpath):
    return send_from_directory(os.path.join(app.static_folder, '_app'), subpath)

# Serves the favicon
@app.route('/favicon.png')
def serve_favicon():
     return send_from_directory(app.static_folder, 'favicon.png')

# Serves images (assuming they are in static/images/)
@app.route('/static/images/<path:filename>')
def serve_image(filename):
    # Construct path relative to the app's static folder
    image_dir = os.path.join(app.static_folder, 'images')
    # Check if directory exists might be redundant if handled by send_from_directory
    if not os.path.isdir(image_dir):
         from werkzeug.exceptions import NotFound
         raise NotFound()
    return send_from_directory(image_dir, filename)

# Serves the sql.js WASM file
@app.route('/sql-wasm.wasm')
def serve_wasm():
     # Serve the wasm file with the correct MIME type
     # Ensure the file exists in the static folder
     wasm_path = os.path.join(app.static_folder, 'sql-wasm.wasm')
     if not os.path.isfile(wasm_path):
          from werkzeug.exceptions import NotFound
          raise NotFound()
     return send_from_directory(app.static_folder, 'sql-wasm.wasm', mimetype='application/wasm')

# --- API Endpoints ---

# == Authentication ==
@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    if not data or not data.get('username') or not data.get('email') or not data.get('password'):
        return jsonify({"error": "Missing username, email, or password"}), 400

    username = data['username'].strip()
    email = data['email'].strip()
    password = data['password']

    if not username or not email or not password:
         return jsonify({"error": "Username, email, and password cannot be empty"}), 400

    # Basic validation could be added here (e.g., password length, email format)

    # Check if user or email already exists
    if User.query.filter_by(username=username).first():
        return jsonify({"error": "Username already exists"}), 409 # 409 Conflict
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email already registered"}), 409

    # Create new user
    new_user = User(username=username, email=email)
    new_user.set_password(password) # Hash the password

    # Add to database
    db.session.add(new_user)
    try:
        db.session.commit()
        # Log the user in immediately after registration
        login_user(new_user)
        print(f"User registered and logged in: {username}") # Server log
        return jsonify({
            "message": "Registration successful",
            "user": {"id": new_user.id, "username": new_user.username}
        }), 201 # 201 Created
    except Exception as e:
        db.session.rollback()
        print(f"Database error during registration: {e}") # Log the error server-side
        traceback.print_exc()
        return jsonify({"error": "Registration failed due to a server error"}), 500

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data or not data.get('username') or not data.get('password'):
         return jsonify({"error": "Missing username or password"}), 400

    username = data['username']
    password = data['password']
    # remember = data.get('remember', False) # Optional "remember me" functionality

    user = User.query.filter_by(username=username).first()

    # Check if user exists and password is correct
    if user and user.check_password(password):
        # Log the user in using Flask-Login (session cookie is set)
        login_user(user) # Add remember=remember if using that feature
        print(f"User logged in: {username}") # Server log
        return jsonify({
            "message": "Login successful",
            "user": {"id": current_user.id, "username": current_user.username} # Use current_user after login_user
        }), 200
    else:
        # Incorrect credentials
        print(f"Failed login attempt for username: {username}") # Server log
        return jsonify({"error": "Invalid username or password"}), 401 # 401 Unauthorized

@app.route('/api/logout', methods=['POST'])
@login_required # Only logged-in users can logout
def logout():
    print(f"User logging out: {current_user.username}") # Server log
    logout_user() # Clears the session cookie via Flask-Login
    return jsonify({"message": "Logout successful"}), 200

@app.route('/api/status', methods=['GET'])
def status():
    if current_user.is_authenticated:
        # User is logged in, return their info
        return jsonify({
            "is_logged_in": True,
            "user": {"id": current_user.id, "username": current_user.username}
        }), 200
    else:
        # User is not logged in
        return jsonify({"is_logged_in": False, "user": None}), 200 # Still 200 OK, just indicates status

# == Game Data ==
@app.route('/api/cases/<string:case_id>/db')
# Consider adding @login_required here if game data should be protected
def get_case_database(case_id):
    """Serves the SQLite database file for a given scenario."""
    print(f"--- Request for /api/cases/{case_id}/db ---")
    # 1. Validate case_id
    if not re.match(r'^[a-zA-Z0-9\-]+$', case_id):
        print(f"Error: Invalid case ID format: {case_id}")
        return jsonify({"error": "Invalid case ID format"}), 400

    # 2. Construct the path safely
    db_directory = os.path.join(basedir, 'instance', 'scenario_dbs')
    db_filename = f"{case_id}.db"
    db_path = os.path.join(db_directory, db_filename)
    print(f"Attempting to serve database from: {db_path}")

    # 3. Check directory and file existence
    if not os.path.isdir(db_directory):
        print(f"Error: Database directory not found: {db_directory}")
        return jsonify({"error": "Server configuration error: DB directory missing."}), 500
    if not os.path.isfile(db_path):
        print(f"Error: Database file not found: {db_path}")
        return jsonify({"error": "Scenario database not found"}), 404

    # 4. Check file size
    try:
        file_size = os.path.getsize(db_path)
        print(f"Success: File found. Size on server: {file_size} bytes.")
        if file_size == 0:
             print(f"Error: File exists but is empty (0 bytes): {db_path}")
             return jsonify({"error": "Server error: Database file is empty."}), 500
    except OSError as e:
         print(f"Error checking file size for {db_path}: {e}")
         return jsonify({"error": "Server error reading database file."}), 500

    # 5. Send the file
    try:
        print(f"Sending file: {db_filename} from directory: {db_directory}")
        return send_from_directory(
            directory=db_directory,
            path=db_filename,
            mimetype='application/octet-stream', # Use octet-stream for reliable binary transfer
            as_attachment=False # Important: Send inline so fetch can read ArrayBuffer
        )
    except Exception as e:
        print(f"Error sending file {db_path}: {e}")
        traceback.print_exc()
        return jsonify({"error": "Server error sending database file"}), 500

# == User Progress ==
@app.route('/api/progress', methods=['GET'])
@login_required # User must be logged in to see their progress
def get_progress():
    """Returns a list of completed level IDs for the current user."""
    try:
        # Fetch all progress records for the currently logged-in user
        user_progress = Progress.query.filter_by(user_id=current_user.id).order_by(Progress.completed_at).all()

        # Format the data to return
        completed_levels = [
            f"{p.scenario_id}/{p.level_id}" for p in user_progress
        ]
        # Example structured data if needed later:
        # completed_levels_structured = [
        #    {"scenario": p.scenario_id, "level": p.level_id, "completed_at": p.completed_at.isoformat()}
        #    for p in user_progress
        # ]

        print(f"User {current_user.id} progress fetched: Count={len(completed_levels)}") # Server log
        return jsonify({"completed_levels": completed_levels}), 200

    except Exception as e:
        print(f"Error fetching progress for user {current_user.id}: {e}")
        traceback.print_exc()
        return jsonify({"error": "Failed to fetch progress"}), 500

@app.route('/api/progress', methods=['POST'])
@login_required # User must be logged in to save progress
def save_progress():
    """Saves a completed level for the current user."""
    data = request.get_json()

    if not data or not data.get('scenario_id') or not data.get('level_id'):
        return jsonify({"error": "Missing scenario_id or level_id"}), 400

    scenario_id = data['scenario_id']
    level_id = data['level_id']
    user_id = current_user.id

    print(f"Attempting to save progress for user {user_id}: {scenario_id}/{level_id}") # Server log

    # Check if this progress already exists
    existing_progress = Progress.query.filter_by(
        user_id=user_id,
        scenario_id=scenario_id,
        level_id=level_id
    ).first()

    if existing_progress:
        print(f"Progress already recorded for {scenario_id}/{level_id} at {existing_progress.completed_at}")
        return jsonify({"message": "Progress already recorded"}), 200 # OK, already done

    # Create a new progress record
    new_progress = Progress(
        user_id=user_id,
        scenario_id=scenario_id,
        level_id=level_id
    )

    db.session.add(new_progress)

    try:
        db.session.commit()
        print("Progress saved successfully.")
        return jsonify({"message": "Progress saved successfully"}), 201 # 201 Created
    except Exception as e:
        db.session.rollback() # Rollback transaction on error
        print(f"Database error saving progress for user {user_id}: {e}")
        traceback.print_exc()
        # Check if it was a unique constraint violation specifically
        if "UNIQUE constraint failed" in str(e):
             return jsonify({"error": "Progress already recorded (constraint violation)"}), 409 # Conflict
        return jsonify({"error": "Failed to save progress due to server error"}), 500


# --- Catch-all route for client-side routing ---
# This MUST come AFTER all other specific API and file routes
@app.route('/<path:path>')
def serve_fallback(path):
    # Exclude API routes, specific static files handled by other routes,
    # and files within the SvelteKit build output directory (_app)
    # Also exclude requests that look like file requests (containing a dot in the final path segment)
    path_segment = path.split('/')[-1]
    if path.startswith('api/') or \
       path.startswith('_app/') or \
       path.startswith('static/') or \
       path == 'favicon.png' or \
       path == 'sql-wasm.wasm' or \
       '.' in path_segment:
        # Let Flask handle potential 404 or other specific routes take precedence
        from werkzeug.exceptions import NotFound
        raise NotFound()

    # Otherwise, assume it's a SvelteKit client-side route and serve the main index.html
    # SvelteKit's router will handle displaying the correct page content based on the URL
    print(f"Fallback route serving index.html for path: {path}") # Log fallback usage
    return send_from_directory(app.static_folder, 'index.html')


# --- Main Execution ---
if __name__ == '__main__':
    # Create database tables if they don't exist using the app context
    with app.app_context():
         print("Checking and creating database tables...")
         db.create_all() # Creates user and progress tables if they don't exist
         print("Database tables checked/created.")
    # Run the app
    # host='0.0.0.0' makes it accessible on your network
    # debug=True enables auto-reloading and detailed error pages (DISABLE in production)
    print("Starting Flask server...")
    app.run(debug=True, host='0.0.0.0', port=5050) # Use port 5000 or another