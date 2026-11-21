import importlib.util
import uuid
import contextlib
import shutil
from pathlib import Path
import unittest
import hashlib
spec=importlib.util.spec_from_file_location('activity',Path(__file__).parents[1]/'update_memory_activity_log.py')
activity=importlib.util.module_from_spec(spec);spec.loader.exec_module(activity)
@contextlib.contextmanager
def fixture_directory():
    base=Path(__file__).resolve().parent
    folder=base/('split-fixture-'+uuid.uuid4().hex)
    folder.mkdir()
    try:yield folder
    finally:
        assert folder.resolve().parent==base and folder.name.startswith('split-fixture-')
        shutil.rmtree(folder)
class SplitTests(unittest.TestCase):
    def test_lossless_unicode_and_record_locations(self):
        original_root,original_parts=activity.ROOT,activity.PARTS
        try:
            with fixture_directory() as folder:
                activity.ROOT=Path(folder);activity.PARTS=Path(folder)/'parts'
                text='header\n'+('record alpha\n'*8)+('long '+chr(0x1f31f)*400)+'\nlast record\n'
                raw=text.encode();source=Path(folder)/'source';source.write_bytes(raw)
                offset=raw.index(b'last record')
                index={'generated_utc':'test','bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest(),'records':1,
                       'sections':[],'snapshot_files':[],'entries':[{'number':1,'byte':offset,'line':raw[:offset].count(b'\n')+1,'timestamp':'test'}]}
                activity.split_archive(source,index,target=128)
                chunks=[(activity.ROOT/p['file']).read_bytes() for p in index['parts']]
                self.assertEqual(b''.join(chunks),raw)
                self.assertTrue(all(len(chunk)<=128 for chunk in chunks))
                for chunk in chunks:chunk.decode('utf-8')
                entry=index['entries'][0];part=(activity.ROOT/entry['file']).read_bytes()
                self.assertTrue(part[entry['part_byte']:].startswith(b'last record'))
                self.assertEqual(part[:entry['part_byte']].count(b'\n')+1,entry['part_line'])
        finally:activity.ROOT,activity.PARTS=original_root,original_parts
if __name__=='__main__':unittest.main()
