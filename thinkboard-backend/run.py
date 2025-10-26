from app import create_app

app = create_app()

if __name__ == '__main__':
    # Binds to 0.0.0.0 to be accessible on your local network
    # Cloudflare Tunnel will forward traffic to this.
    app.run(host='0.0.0.0', port=5000, debug=True)