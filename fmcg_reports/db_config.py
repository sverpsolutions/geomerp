import json
import os

# Config path in the application root directory
CONFIG_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'db_config.json')

# New connection credentials shared by the user
DEFAULT_SERVER   = os.environ.get('DB_SERVER', '')
DEFAULT_NAME     = 'RetailWizard'
DEFAULT_USER     = os.environ.get('DB_USER', '')
DEFAULT_PASSWORD = os.environ.get('DB_PASSWORD', '')

def get_secret(key, default=''):
    """Env var first, then db_config.json (kept out of git)."""
    if os.environ.get(key):
        return os.environ[key]
    try:
        with open(CONFIG_PATH) as f:
            return json.load(f).get(key, default)
    except Exception:
        return default

def load_config():
    """Load configuration from db_config.json or return default credentials."""
    if os.path.exists(CONFIG_PATH):
        try:
            with open(CONFIG_PATH, 'r') as f:
                config = json.load(f)
                server = config.get('DB_SERVER', DEFAULT_SERVER)
                name = config.get('DB_NAME', DEFAULT_NAME)
                user = config.get('DB_USER', DEFAULT_USER)
                password = config.get('DB_PASSWORD', DEFAULT_PASSWORD)
                return server, name, user, password
        except Exception:
            pass
    return DEFAULT_SERVER, DEFAULT_NAME, DEFAULT_USER, DEFAULT_PASSWORD

def save_config(server, name, user, password):
    """Save database configuration parameters to db_config.json."""
    config = {
        'DB_SERVER': str(server).strip(),
        'DB_NAME': str(name).strip(),
        'DB_USER': str(user).strip(),
        'DB_PASSWORD': str(password).strip()
    }
    with open(CONFIG_PATH, 'w') as f:
        json.dump(config, f, indent=4)
    return True
