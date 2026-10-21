"""Publish the reviewed SIADESK manifest through NSIASGL's publi_app f command.

Uses the existing VPS SSH key, without writing credentials to publi_config.py.
The targeted migration is applied before exposing the new routes.
"""
import builtins
import hashlib
import json
import posixpath
import sys
from datetime import datetime, timezone
from pathlib import Path

import paramiko

ROOT = Path('D:/Projetos/Novo SIASGL/NSIASGL')
HERE = Path(__file__).resolve().parent
REMOTE = '/home/siasgl/htdocs/siasgl.siamac.com.br'
KEY = str(Path.home() / '.ssh/vps_72_61_25_204_ed25519')
sys.path.insert(0, str(ROOT))
import publi_app

def connect(host='72.61.25.204', user='root', password=None):
    client = paramiko.SSHClient()
    client.load_system_host_keys()
    client.set_missing_host_key_policy(paramiko.RejectPolicy())
    client.connect(host, username=user, key_filename=KEY, timeout=15)
    return client, client.open_sftp()

def run(client, command):
    _, stdout, stderr = client.exec_command(command, timeout=120)
    output, error = stdout.read().decode(), stderr.read().decode()
    code = stdout.channel.recv_exit_status()
    print(output, end='')
    if code: raise RuntimeError(error or output)

def main():
    sys.stdout.reconfigure(encoding='utf-8')
    files = json.loads((HERE / 'siadesk-server-manifest.json').read_text())
    # Dependencies and templates first; routes expose the API only at the end.
    files.sort(key=lambda path: (path == 'routes/api.php', path.startswith('app/Filament/'), path))
    client, sftp = connect()
    backup = '/home/siasgl/siadesk-release-' + datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    sftp.mkdir(backup)
    existing = []
    for relative in files:
        try:
            with sftp.open(REMOTE + '/' + relative, 'rb') as source: data = source.read()
        except FileNotFoundError: continue
        existing.append(relative)
        destination = backup + '/' + relative
        directories = posixpath.dirname(destination).split('/')
        current = ''
        for part in directories:
            if not part: continue
            current += '/' + part
            try: sftp.mkdir(current)
            except OSError: pass
        with sftp.open(destination, 'wb') as target: target.write(data)
    with sftp.open(backup + '/manifest.json', 'w') as target:
        target.write(json.dumps({'files': files, 'previously_existing': existing}, indent=2))
    print('Backup:', backup)
    (HERE / 'siadesk-release.txt').write_text(backup)
    stage = (HERE / 'siadesk-stage.txt').read_text().strip()
    assert stage.startswith('/home/siasgl/siadesk-test-') and ' ' not in stage
    migration = stage + '/database/migrations/2026_09_14_000001_create_siadesk_tables.php'
    run(client, 'cd ' + REMOTE + ' && php artisan migrate --force --realpath --path=' + migration)
    sftp.close()
    client.close()
    publi_app.cfg.FTP_HOST = '72.61.25.204'
    publi_app.cfg.FTP_PATH = REMOTE
    publi_app.cfg.SFTP_USER = 'root'
    publi_app.cfg.SFTP_PASS = 'ssh-key-authentication'
    publi_app.cfg.SFTP_ENABLE = 1
    publi_app.open_sftp_connection = connect
    commands = iter(['f ' + ' | '.join(files), 'exit'])
    builtins.input = lambda prompt='': next(commands)
    sys.argv = ['publi_app.py']
    try: publi_app.main()
    except SystemExit as error:
        if error.code not in (None, 0): raise
    client, sftp = connect()
    for relative in files:
        with sftp.open(REMOTE + '/' + relative, 'rb') as source: remote_hash = hashlib.sha256(source.read()).hexdigest()
        assert remote_hash == hashlib.sha256((ROOT / relative).read_bytes()).hexdigest(), relative
    run(client, 'cd ' + REMOTE + ' && php artisan route:clear && php artisan view:clear && php artisan filament:clear-cached-components && php artisan route:list --path=siadesk')
    run(client, 'chown -R siasgl:siasgl ' + ' '.join(REMOTE + '/' + p for p in files))
    client.close()
    print('All published files verified by SHA-256.')

if __name__ == '__main__': main()
