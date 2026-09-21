"""Select visitor-facing fields from handoff 18's normalized, local evidence.
No network; raw archives and account inspection notes stay in docs/research-assets.
Run normalize.py first. --check verifies the checked-in private snapshot unchanged.
"""
from pathlib import Path
import hashlib
import json
import sys

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'docs/redesign/research-assets/animalfeed-2026-09-17/animalfeed-analytics.json'
TARGET = ROOT / 'app/src/prototype/assets/animalfeed-snapshot.json'
raw = json.loads(SOURCE.read_text())
def select(row, fields):
    return {k: row[k] for k in fields}
metrics = ['views', 'watchHours', 'subscribersNet', 'impressions', 'ctrPercent']
payload = {
    'channel': select(raw['channel'], ['name', 'handle', 'url']),
    'source': {'label': 'YouTube Studio CSV export', 'retrievedOn': raw['retrievedOn'],
               'countingChangeOn': '2026-08-27'},
    'period': select(raw['period'], ['from', 'to', 'label', 'reportingTimezone']),
    'totals': select(raw['totals'], metrics),
    'daily': [select(r, ['date', *metrics[:4]]) for r in raw['daily']],
    'content': [select(r, ['id', 'title', 'published', 'durationSeconds', *metrics]) for r in raw['content']],
}
assert len(payload['daily']) == 280 and len(payload['content']) == 72
text = json.dumps(payload, ensure_ascii=False, separators=(',', ':')) + '\n'
assert '@gmail.com' not in text and '.zip' not in text
if '--check' in sys.argv:
    assert TARGET.read_text() == text, 'Private snapshot differs; rerun preparation after checking evidence.'
else:
    TARGET.write_text(text)
print(json.dumps({'source': str(SOURCE.relative_to(ROOT)), 'sourceSha256': hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
                  'snapshot': str(TARGET.relative_to(ROOT)), 'snapshotSha256': hashlib.sha256(text.encode()).hexdigest(),
                  'dailyDates': len(payload['daily']), 'contentRows': len(payload['content']), 'mode': 'check' if '--check' in sys.argv else 'write'}, indent=2))
