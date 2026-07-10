#!/usr/bin/env python3
import paramiko
import sys

# Server configuration
HOST = '89.116.32.1'
PORT = 22
USERNAME = 'root'
PASSWORD = 'Gogate@1248529'

# Project path on server - find it first
PROJECT_PATH = '/root/VGMF-FELLOWSHIP'
BRANCH = 'feature-interviews-reports-scoring-backup'

def ssh_connect():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(HOST, port=PORT, username=USERNAME, password=PASSWORD, timeout=30)
        return client
    except Exception as e:
        print(f"Connection failed: {e}")
        return None

def run_command(client, command, description=""):
    print(f"\n{'='*60}")
    print(f"Running: {description or command}")
    print(f"{'='*60}")
    
    stdin, stdout, stderr = client.exec_command(command, get_pty=True)
    
    # Get output in real-time
    output = []
    for line in stdout:
        print(line, end='')
        output.append(line)
    
    # Get errors
    errors = stderr.read().decode()
    if errors:
        print(f"\nErrors:\n{errors}")
    
    exit_status = stdout.channel.recv_exit_status()
    return exit_status, ''.join(output), errors

def find_project_path(client):
    """Find the project path on server"""
    paths_to_check = [
        '/root/VGMF-FELLOWSHIP',
        '/var/www/VGMF-FELLOWSHIP',
        '/home/VGMF-FELLOWSHIP',
        '/VGMF-FELLOWSHIP',
        '~/VGMF-FELLOWSHIP',
    ]
    
    for path in paths_to_check:
        exit_code, _, _ = run_command(client, f'ls -la {path} 2>/dev/null && echo "FOUND:{path}"', f"Checking {path}")
    
    # Let user specify or use default
    return '/root/VGMF-FELLOWSHIP'

def main():
    print("="*60)
    print("VGMF Fellowship - Deployment Script")
    print("="*60)
    
    client = ssh_connect()
    if not client:
        sys.exit(1)
    
    try:
        # Find project path
        print("\n[0/8] Finding project path...")
        stdin, stdout, stderr = client.exec_command('find / -name "VGMF-FELLOWSHIP" -type d 2>/dev/null | head -5')
        paths = stdout.read().decode().strip()
        if paths:
            print(f"Found paths: {paths}")
            PROJECT_PATH = paths.split('\n')[0]
        else:
            print("Project not found, using default path...")
            PROJECT_PATH = '/root/VGMF-FELLOWSHIP'
        
        print(f"Using project path: {PROJECT_PATH}")
        
        # Step 1: Navigate to project and fetch latest
        print("\n[1/8] Navigating to project and fetching updates...")
        exit_code, _, _ = run_command(
            client,
            f'cd {PROJECT_PATH} && git fetch origin && git checkout {BRANCH} && git pull origin {BRANCH}',
            "Fetch and checkout branch"
        )
        if exit_code != 0:
            print("Failed to fetch updates!")
            return
        
        # Step 2: Install dependencies
        print("\n[2/8] Installing dependencies...")
        exit_code, _, _ = run_command(client, f'cd {PROJECT_PATH} && npm install', "npm install")
        if exit_code != 0:
            print("npm install failed, trying anyway...")
        
        # Step 3: Run Prisma migrate
        print("\n[3/8] Running Prisma migrations...")
        exit_code, _, _ = run_command(client, f'cd {PROJECT_PATH} && npx prisma migrate deploy', "Prisma migrate")
        if exit_code != 0:
            print("Warning: Prisma migrate had issues (may be normal if no changes)")
        
        # Step 4: Generate Prisma client
        print("\n[4/8] Generating Prisma client...")
        exit_code, _, _ = run_command(client, f'cd {PROJECT_PATH} && npx prisma generate', "Prisma generate")
        
        # Step 5: Build the application
        print("\n[5/8] Building application...")
        exit_code, _, _ = run_command(client, f'cd {PROJECT_PATH} && npm run build', "npm run build")
        if exit_code != 0:
            print("Build failed!")
            return
        
        # Step 6: Restart PM2
        print("\n[6/8] Restarting PM2...")
        exit_code, _, _ = run_command(client, f'cd {PROJECT_PATH} && pm2 restart all', "pm2 restart")
        
        # Step 7: Check status
        print("\n[7/8] Checking PM2 status...")
        exit_code, _, _ = run_command(client, 'pm2 status', "pm2 status")
        
        # Step 8: Check logs for errors
        print("\n[8/8] Checking recent logs...")
        exit_code, _, _ = run_command(client, 'pm2 logs --nostream --lines 20', "pm2 logs")
        
        print("\n" + "="*60)
        print("Deployment completed!")
        print("="*60)
        print(f"\nApp should be running at: https://work-1-ryzjjvookrieubjn.prod-runtime.all-hands.dev/")
        
    except Exception as e:
        print(f"Error during deployment: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    main()
