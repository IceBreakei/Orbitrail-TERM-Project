#!/usr/bin/env python3
"""Rebuild this chat's searchable, source-backed activity archive. Standard library only."""
import argparse
import base64
import collections
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import sqlite3
import subprocess
import contextlib
import bisect

THREAD = '01a18d85-1c4b-7ee3-bcaa-39f9f31e2c4e'
ROOT = Path(__file__).resolve().parents[1]
LOG = ROOT / 'Memory Activity Log.txt'
INDEX = ROOT / 'Memory Activity Log.index.json'
PARTS = ROOT / 'Memory Activity Log Parts'
PART_BYTES = 8 * 1024 * 1024
CODE_SUFFIXES = {'.js', '.mjs', '.cjs', '.css', '.html', '.htm', '.json', '.py', '.ps1', '.sql', '.toml', '.yaml', '.yml', '.md', '.txt', '.svg'}
TOOL_TYPES = {'function_call', 'function_call_output', 'custom_tool_call', 'custom_tool_call_output'}
ACTIVITY_TYPES = {'CommandExecution', 'FileChange', 'McpToolCall', 'ImageView', 'WebSearch', 'Extension', 'SubAgentActivity'}


def digest(data):
    return hashlib.sha256(data).hexdigest()


def find_sources(home):
    found = []
    for base in [home / 'sessions', home / 'archived_sessions']:
        if not base.exists():
            continue
        for path in base.rglob('*.jsonl'):
            try:
                with path.open(encoding='utf-8') as stream:
                    first = json.loads(stream.readline())
                meta = first.get('payload', {})
                if first.get('type') == 'session_meta':
                    source = meta.get('source', {})
                    spawn = source.get('subagent', {}).get('thread_spawn', {}) if isinstance(source, dict) else {}
                    found.append((path, meta.get('id'), spawn.get('parent_thread_id'), spawn.get('agent_path')))
            except (OSError, ValueError):
                continue
    ids = {THREAD}
    while True:
        expanded = ids | {ident for _, ident, parent, _ in found if parent in ids}
        if expanded == ids:
            break
        ids = expanded
    return sorted((item for item in found if item[1] in ids), key=lambda item: str(item[0]))


def content_text(content):
    if isinstance(content, str):
        return content
    if not isinstance(content, list):
        return ''
    return '\n'.join(part.get('text', '') for part in content if isinstance(part, dict) and part.get('type', '').lower() in {'text', 'input_text', 'output_text'})


def safe_payload(payload):
    # Retain visible/tool content, not private runtime metadata or reasoning records.
    return {key: value for key, value in payload.items() if key not in {'internal_chat_message_metadata_passthrough', 'logprobs'}}


def ingest(db, sources):
    db.execute('CREATE TABLE records (seq INTEGER PRIMARY KEY, timestamp TEXT, source TEXT, source_line INTEGER, scope TEXT, kind TEXT, role TEXT, phase TEXT, payload TEXT, text_hash TEXT)')
    reports = []
    seq = 0
    for path, ident, parent, agent_path in sources:
        report = {'path': str(path), 'session_id': ident, 'parent_thread_id': parent, 'agent_path': agent_path, 'bytes_at_read': path.stat().st_size,
                  'first_timestamp': None, 'last_timestamp': None, 'records': {}, 'parse_errors': [], 'source_truncation_markers': 0}
        counts = collections.Counter()
        source_hash = hashlib.sha256()
        with path.open('rb') as stream:
            for number, raw in enumerate(stream, 1):
                source_hash.update(raw)
                try:
                    record = json.loads(raw)
                except (ValueError, UnicodeDecodeError) as error:
                    report['parse_errors'].append({'line': number, 'error': str(error)})
                    continue
                payload = record.get('payload', {})
                timestamp = record.get('timestamp', '')
                report['first_timestamp'] = report['first_timestamp'] or timestamp
                report['last_timestamp'] = timestamp
                category, kind = record.get('type'), None
                role = phase = ''
                data = None
                if category == 'response_item':
                    ptype = payload.get('type')
                    if ptype == 'message' and payload.get('role') in {'user', 'assistant'}:
                        phase = payload.get('phase', payload.get('channel', '')) or ''
                        if phase not in {'analysis', 'summary'}:
                            kind, role, data = 'MESSAGE', payload['role'], safe_payload(payload)
                    elif ptype in TOOL_TYPES:
                        kind, data = 'TOOL', safe_payload(payload)
                elif category == 'event_msg' and payload.get('type') == 'item_completed':
                    item = payload.get('item', {})
                    itype = item.get('type')
                    if itype in {'UserMessage', 'AgentMessage'}:
                        phase = item.get('phase', '') or ''
                        if phase not in {'analysis', 'summary'}:
                            kind, role, data = 'MESSAGE_MIRROR', 'user' if itype == 'UserMessage' else 'assistant', item
                    elif itype in ACTIVITY_TYPES:
                        kind, data = 'ACTIVITY', item
                if not kind:
                    continue
                text = content_text(data.get('content', [])) if role else ''
                encoded = json.dumps(data, ensure_ascii=False)
                report['source_truncation_markers'] += encoded.lower().count('output truncated') + encoded.lower().count('tokens truncated')
                counts[kind + (':' + role if role else '')] += 1
                seq += 1
                db.execute('INSERT INTO records VALUES (?,?,?,?,?,?,?,?,?,?)',
                           (seq, timestamp, str(path), number, 'main' if ident == THREAD else (agent_path or ident), kind, role, phase, encoded,
                            digest((role + '\n' + phase + '\n' + text).encode('utf-8')) if role else None))
        report['sha256_at_read'] = source_hash.hexdigest()
        report['records'] = dict(counts)
        reports.append(report)
        db.commit()
    db.execute('CREATE INDEX record_message_hash ON records(text_hash,kind,timestamp)')
    return reports


class Writer:
    def __init__(self, path):
        self.file = path.open('wb')
        self.line = 1
        self.sections = []

    def write(self, text):
        self.file.write(text.encode('utf-8'))
        self.line += text.count('\n')

    def section(self, title):
        self.sections.append({'title': title, 'line': self.line, 'byte': self.file.tell()})
        self.write('\n' + '=' * 78 + '\n' + title + '\n' + '=' * 78 + '\n')


def write_record(writer, row, number):
    _, timestamp, source, source_line, scope, kind, role, phase, encoded, _ = row
    payload = json.loads(encoded)
    entry = {'number': number, 'timestamp': timestamp, 'scope': scope, 'kind': kind, 'role': role, 'phase': phase,
             'line': writer.line, 'byte': writer.file.tell(), 'source': source, 'source_line': source_line,
             'source_id': payload.get('id')}
    writer.write(f'\n--- RECORD {number:06d} | {timestamp} | {scope} | {kind} {role} {phase} ---\nSOURCE: {source}:{source_line}\n')
    if role:
        text = content_text(payload.get('content', []))
        writer.write(text + '\n')
        entry['preview'] = text[:180].replace('\n', ' ')
        # Full content retains non-text attachments as recorded, without truncation.
        writer.write('\nFULL RECORDED MESSAGE (JSON; includes attachment blocks when present):\n')
        writer.write(json.dumps(payload, ensure_ascii=False, indent=2) + '\n')
    else:
        writer.write(json.dumps(payload, ensure_ascii=False, indent=2) + '\n')
        for key in ['input', 'command', 'arguments', 'aggregated_output', 'stdout', 'stderr', 'output']:
            value = payload.get(key)
            if isinstance(value, str) and value:
                writer.write(f'\nVERBATIM {key.upper()}:\n{value}\n')
        if payload.get('type') == 'FileChange':
            for name, change in payload.get('changes', {}).items():
                if not isinstance(change, dict):
                    continue
                for field in ['diff', 'content', 'patch']:
                    if isinstance(change.get(field), str):
                        writer.write(f'\nVERBATIM FILE CHANGE | {name} | {field}:\n{change[field]}\n')
    return entry


def export_git(writer):
    result = {}
    commands = [
        ('Git commit history and recorded line-level patches', ['git', 'log', '--all', '--reverse', '--root', '--format=fuller', '-p', '--no-ext-diff', '--', '.', ':(exclude)sprites/**', ':(exclude)Audio/**', ':(exclude)chat_log.txt', ':(exclude)Memory Activity Log*']),
        ('Current tracked working-tree patch (not an attribution of every line to the assistant)', ['git', 'diff', 'HEAD', '--no-ext-diff', '--', '.', ':(exclude)sprites/**', ':(exclude)Audio/**', ':(exclude)chat_log.txt', ':(exclude)Memory Activity Log*']),
        ('Current repository status', ['git', 'status', '--short'])]
    for title, command in commands:
        writer.section(title)
        writer.write('COMMAND: ' + ' '.join(command) + '\n')
        process = subprocess.run(command, cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        writer.write(process.stdout.decode('utf-8', 'replace'))
        error = process.stderr.decode('utf-8', 'replace')
        if error:
            writer.write('\nGIT STDERR:\n' + error)
        result[title] = {'exit_code': process.returncode}
    return result


def snapshot(writer):
    writer.section('Current text/source files, verbatim baseline for future line-by-line comparisons')
    files = []
    ignored_dirs = {'.git', 'node_modules', '.codex', '.agents', '.aws', '.venv', '__pycache__', 'Audio', 'sprites', 'Memory Activity Log Parts'}
    for folder, dirs, names in os.walk(ROOT):
        dirs[:] = sorted(name for name in dirs if name not in ignored_dirs)
        for name in sorted(names):
            path = Path(folder) / name
            relative = path.relative_to(ROOT).as_posix()
            if name.startswith('Memory Activity Log') or name == 'chat_log.txt' or path.suffix.lower() not in CODE_SUFFIXES:
                continue
            raw = path.read_bytes()
            if b'\x00' in raw:
                continue
            try:
                text, encoding = raw.decode('utf-8-sig'), 'utf-8-sig'
            except UnicodeDecodeError:
                text, encoding = raw.decode('cp1252', 'replace'), 'cp1252 (mixed historical files may contain legacy encoding)'
            item = {'path': relative, 'bytes': len(raw), 'sha256': digest(raw), 'encoding': encoding, 'line': writer.line, 'byte': writer.file.tell()}
            files.append(item)
            writer.write(f'\n--- SNAPSHOT FILE: {relative} | sha256={item["sha256"]} | encoding={encoding} ---\n')
            writer.write(text + ('\n' if not text.endswith('\n') else ''))
            if encoding != 'utf-8-sig':
                writer.write('RAW ORIGINAL BYTES (BASE64; exact mixed-encoding source):\n'+base64.b64encode(raw).decode('ascii')+'\n')
    return files


def split_archive(source, index, target=PART_BYTES):
    """Lossless UTF-8 parts; prefer record boundaries and preserve original global offsets."""
    PARTS.mkdir(exist_ok=True)
    boundaries=sorted({0,*[item['byte'] for group in ('entries','sections','snapshot_files') for item in index[group]]})
    parts=[];full_hash=hashlib.sha256();offset=0;line=1
    with source.open('rb') as stream:
        while True:
            stream.seek(offset);block=stream.read(target)
            if not block:break
            if len(block)==target:
                end=offset+len(block)
                position=bisect.bisect_right(boundaries,end)-1
                boundary=boundaries[position] if position>=0 else 0
                if boundary>=offset+target//2:
                    block=block[:boundary-offset]
                else:
                    newline=block.rfind(b'\n')
                    if newline>=target//2:block=block[:newline+1]
                    else:
                        # A large recorded/base64 line may span parts. Never cut a UTF-8 codepoint.
                        while True:
                            try:block.decode('utf-8');break
                            except UnicodeDecodeError as error:
                                if error.start<len(block)-4:raise
                                block=block[:error.start]
            block.decode('utf-8')
            name=f'Memory Activity Log - {len(parts)+1:03d}.txt'
            output=PARTS/name;temporary=output.with_suffix('.building');temporary.write_bytes(block);os.replace(temporary,output)
            parts.append({'number':len(parts)+1,'file':output.relative_to(ROOT).as_posix(),'bytes':len(block),
                          'start_byte':offset,'end_byte':offset+len(block),'start_line':line,'sha256':digest(block)})
            full_hash.update(block);offset+=len(block);line+=block.count(b'\n')
    if offset!=index['bytes'] or full_hash.hexdigest()!=index['sha256']:
        raise RuntimeError('Split verification failed; original archive has not been replaced.')
    starts=[part['start_byte'] for part in parts]
    for group in ('entries','sections','snapshot_files'):
        for item in index[group]:
            part=parts[bisect.bisect_right(starts,item['byte'])-1]
            item.update(file=part['file'],part_byte=item['byte']-part['start_byte'],part_line=item['line']-part['start_line']+1)
    for part in parts:
        records=[entry for entry in index['entries'] if entry['file']==part['file']]
        part['first_record']=records[0]['number'] if records else None
        part['last_record']=records[-1]['number'] if records else None
        part['first_timestamp']=records[0]['timestamp'] if records else None
        part['last_timestamp']=records[-1]['timestamp'] if records else None
        part['sections']=[section['title'] for section in index['sections'] if section['file']==part['file']]
    index.update(format='ordered-lossless-parts-v1',parts=parts,part_target_bytes=target)
    guide=['MEMORY ACTIVITY LOG - START HERE / READING ORDER',
           'Original chat begins October 30, 2026 at 8:54 AM America/Vancouver.',
           'Generated UTC: '+index['generated_utc'],'',
           'The full archive is split into the numbered TXT files below (maximum 8 MiB each).',
           'Read them in ascending numeric order. Part 001 contains original coverage and limitations.',
           'Main conversation is chronological first; delegated records and supplemental evidence follow.',
           'These are verbatim consecutive segments, not summaries. A long record may continue into the next part.',
           'No headers are inserted into parts: concatenating their bytes exactly restores the full archive.',
           'Later user corrections override earlier records. Verify current code before relying on old implementations.',
           'Use Memory Activity Log.index.json to find records by preview, timestamp, source or section.',
           'Each entry now gives file, part_line and part_byte; original line/byte refer to the concatenated archive.',
           'Read only relevant ranges. Do not load the whole archive into context.',
           'Refresh: python tools/update_memory_activity_log.py','',
           f"Total: {len(parts)} parts; {index['bytes']:,} bytes; {index['records']:,} records.",
           'Verified concatenated SHA256: '+index['sha256'],'','READING ORDER']
    for part in parts:
        detail=f"{part['number']:03d}. {part['file']} ({part['bytes']/1024/1024:.2f} MiB)"
        if part['first_record'] is not None:
            detail+=f" | records starting here {part['first_record']:06d}-{part['last_record']:06d} | {part['first_timestamp']} to {part['last_timestamp']}"
        else:detail+=' | continuation / supplemental evidence'
        guide.append(detail)
        for title in part['sections']:guide.append('     Section: '+title)
    guide.extend(['','SECTION LOCATOR'])
    guide.extend(f"{section['title']}: {section['file']} line {section['part_line']}" for section in index['sections'])
    return '\n'.join(guide)+'\n'


def build(home, final_response=None):
    sources = find_sources(home)
    if not any(ident == THREAD for _, ident, _, _ in sources):
        raise SystemExit('The original chat archives were not found; no log was overwritten.')
    generated = dt.datetime.now(dt.timezone.utc).isoformat()
    temp = LOG.with_suffix('.building')
    with contextlib.closing(sqlite3.connect(':memory:')) as db:
        reports = ingest(db, sources)
        counts = dict(db.execute('SELECT kind || CASE WHEN role != "" THEN ":" || role ELSE "" END, count(*) FROM records GROUP BY kind,role'))
        writer = Writer(temp)
        writer.write('MEMORY ACTIVITY LOG\nOriginal chat: Friday, October 30, 2026 at 8:54 AM America/Vancouver\n')
        writer.write('Opening request: "For the first step, could you create a txt file that logs all prompts, responses, changes and chat logs there"\n')
        writer.write(f'Thread: {THREAD}\nGenerated UTC: {generated}\nCompanion searchable index: Memory Activity Log.index.json\nRefresh: python tools/update_memory_activity_log.py\n\n')
        writer.write('READ THIS FIRST\nThis is a source-backed archive, not a condensed replacement for the conversation. It preserves available user and visible assistant messages, questions, tool calls/results, recorded file-change patches, and code-writing commands. Supporting tool-event mirrors are deliberately retained. Original source paths/line numbers are provided for auditing.\n')
        writer.write('Coverage: starts with the exact October 30 opening request and continues through the last available records listed below. A refresh captures subsequent turns. Internal reasoning, system/developer instructions, and private runtime configuration are not conversation content and are not exported. No unavailable or already-truncated historical content is invented. Original recordings may already contain truncation or interrupted actions; those limitations remain visible.\n')
        writer.write('Code-history limits: recorded patches and write commands are preserved verbatim, with Git history/current diff and a current source snapshot as additional evidence. Shell-based writes do not always record intermediate before/after file contents. Changes made outside the recorded tools, missing archive segments, and unrecorded intermediate file versions cannot be guaranteed recoverable. Git/current snapshots may also contain user edits; they are labelled evidence, not claimed assistant authorship. Binary project assets are outside the text/source snapshot, while recorded attachment/tool blocks are preserved as present in the archives.\n')
        writer.write('Memory use: consult this header, the index and the latest relevant records, then search this file for the topic/file/record number. Later user corrections supersede older instructions; old designs remain here as historical records. Never load the whole archive into a context window.\n\n')
        writer.write('SOURCE COVERAGE\n' + json.dumps(reports, ensure_ascii=False, indent=2) + '\nRECORD COUNTS\n' + json.dumps(counts, indent=2) + '\n')
        writer.section('Chronological main conversation and tool/code activity')
        entries = []
        skipped_mirrors = 0
        for row in db.execute('SELECT * FROM records WHERE scope="main" ORDER BY timestamp,seq'):
            if row[5] == 'MESSAGE_MIRROR':
                # Suppress presentation mirrors only when matching visible text/phase exists nearby.
                timestamp = dt.datetime.fromisoformat(row[1].replace('Z', '+00:00'))
                nearby = db.execute('SELECT timestamp FROM records WHERE text_hash=? AND kind="MESSAGE" AND scope="main"', (row[9],)).fetchall()
                if any(abs((timestamp-dt.datetime.fromisoformat(value[0].replace('Z','+00:00'))).total_seconds()) < 5 for value in nearby):
                    skipped_mirrors += 1
                    continue
            entries.append(write_record(writer, row, len(entries) + 1))
        writer.section('Delegated work: associated child-agent visible messages and tool/code records')
        for row in db.execute('SELECT * FROM records WHERE scope!="main" ORDER BY timestamp,seq'):
            # Child task instructions are labelled delegated activity, not additional user prompts.
            entries.append(write_record(writer, row, len(entries) + 1))
        if final_response:
            writer.section('Final response prepared for this archive-generation turn')
            writer.write(final_response + '\n')
        writer.section('Existing chat_log.txt preserved verbatim as supplemental historical evidence')
        old = ROOT / 'chat_log.txt'
        raw = old.read_bytes() if old.exists() else b''
        try:
            oldtext = raw.decode('utf-8-sig')
        except UnicodeDecodeError:
            oldtext = raw.decode('cp1252', 'replace')
        writer.write(oldtext + '\n')
        writer.write('RAW ORIGINAL chat_log.txt BYTES (BASE64; exact encoding preserved):\n'+base64.b64encode(raw).decode('ascii')+'\n')
        old_hash = digest(raw)
        git = export_git(writer)
        files = snapshot(writer)
        writer.section('Archive verification and refresh instructions')
        writer.write(f'Exported records: {len(entries)}\nPresentation mirrors suppressed (matching canonical message within 5 seconds): {skipped_mirrors}\nSource snapshot files: {len(files)}\nOriginal chat_log.txt SHA256: {old_hash}\n')
        writer.write('Refresh after future work: python tools/update_memory_activity_log.py\nThe source archives are read-only; this tool only rebuilds the workspace archive and its index. Regeneration captures later records, including previous refresh results. Source-truncated text is never silently filled in.\n')
        sections = writer.sections
        writer.file.close()
        archive_hash = hashlib.sha256()
        with temp.open('rb') as stream:
            while block := stream.read(1024 * 1024):
                archive_hash.update(block)
        index = {'thread_id': THREAD, 'generated_utc': generated, 'log': LOG.name, 'bytes': temp.stat().st_size, 'sha256': archive_hash.hexdigest(),
                 'records': len(entries), 'source_counts': counts, 'presentation_mirrors_suppressed': skipped_mirrors, 'sources': reports,
                 'sections': sections, 'entries': entries, 'snapshot_files': files, 'git': git, 'chat_log_sha256': old_hash}
        guide=split_archive(temp,index)
        INDEX.write_text(json.dumps(index, ensure_ascii=False, indent=2), encoding='utf-8')
        LOG.write_text(guide,encoding='utf-8')
        temp.unlink()
        current={part['file'] for part in index['parts']}
        for old in PARTS.glob('Memory Activity Log - [0-9][0-9][0-9].txt'):
            if old.relative_to(ROOT).as_posix() not in current:old.unlink()
        db.close()
        print(json.dumps({'log': str(LOG), 'bytes': index['bytes'], 'parts':len(index['parts']), 'records': len(entries), 'snapshot_files': len(files), 'sources': len(reports),
                          'parse_errors': sum(len(r['parse_errors']) for r in reports), 'sha256': index['sha256']}, indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--codex-home', type=Path, default=Path.home()/'.codex')
    parser.add_argument('--final-response', help='Exact prepared visible final response, captured before it is sent.')
    args = parser.parse_args()
    build(args.codex_home, args.final_response)
