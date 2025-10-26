from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
import os

db = SQLAlchemy()

def create_app():
    app = Flask(__name__, instance_relative_config=True)

    # Allow requests from any origin. Your Cloudflare Tunnel will secure it.
    CORS(app)

    # Configure the SQLite database
    # It will be created in the 'instance' folder at the root of the project
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///notes.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    # Ensure the instance folder exists
    try:
        os.makedirs(app.instance_path)
    except OSError:
        pass

    db.init_app(app)

    with app.app_context():
        from . import routes
        app.register_blueprint(routes.api_bp)

        # Create database tables if they don't exist
        db.create_all()

    return app