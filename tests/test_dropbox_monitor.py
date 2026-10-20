import io
import json
import tempfile
import unittest
import zipfile
from pathlib import Path
from types import SimpleNamespace

from scripts import dropbox_monitor


class SafeExtractTests(unittest.TestCase):
    def test_rejects_archive_with_path_traversal(self):
        with tempfile.TemporaryDirectory() as directory:
            archive = Path(directory) / "recording.zip"
            with zipfile.ZipFile(archive, "w") as bundle:
                bundle.writestr("../transcript.txt", "malicious")

            with self.assertRaisesRegex(ValueError, "unsafe ZIP member"):
                dropbox_monitor.extract_transcript(archive, Path(directory) / "intake")

    def test_rejects_oversized_transcript_before_extraction(self):
        with tempfile.TemporaryDirectory() as directory:
            archive = Path(directory) / "recording.zip"
            with zipfile.ZipFile(archive, "w") as bundle:
                bundle.writestr("nested/transcript.txt", "too large")

            with self.assertRaisesRegex(ValueError, "size limit"):
                dropbox_monitor.extract_transcript(
                    archive, Path(directory) / "intake", max_bytes=4
                )


class DeduplicationTests(unittest.TestCase):
    def test_uses_dropbox_file_id_and_revision_and_sorts_deterministically(self):
        entries = [
            SimpleNamespace(
                id="id:b", rev="2", name="craig_b.zip", path_display="/b", size=20
            ),
            SimpleNamespace(
                id="id:a", rev="1", name="craig_a.zip", path_display="/a", size=10
            ),
            SimpleNamespace(
                id="id:a", rev="2", name="craig_a.zip", path_display="/a", size=11
            ),
        ]

        unseen = dropbox_monitor.select_unseen(entries, {"processed": {"id:a:1": {}}})

        self.assertEqual([item["identity"] for item in unseen], ["id:a:2", "id:b:2"])


class KanbanChainTests(unittest.TestCase):
    def test_creates_linked_prepare_author_publish_chain_with_required_contracts(self):
        calls = []

        def runner(command, **kwargs):
            calls.append(command)
            task_id = ("t_prepare", "t_author", "t_publish")[len(calls) - 1]
            return SimpleNamespace(stdout=json.dumps({"id": task_id}), returncode=0)

        tasks = dropbox_monitor.create_task_chain(
            {
                "identity": "id:abc:42",
                "file_id": "id:abc",
                "revision": "42",
                "name": "craig_2026-10-14.zip",
            },
            Path("/intake/id_abc-42/transcript.txt"),
            runner=runner,
            repo_root=Path("/repo"),
            hermes_bin="hermes",
        )

        self.assertEqual(tasks, {"prepare": "t_prepare", "author": "t_author", "publish": "t_publish"})
        self.assertIn("swiftquill-dev", calls[0])
        self.assertIn("default", calls[1])
        self.assertIn("t_prepare", calls[1])
        self.assertIn("t_author", calls[2])
        author_body = calls[1][calls[1].index("--body") + 1]
        self.assertIn("vault-index.md first", author_body)
        self.assertIn("Campaign Synopsis", author_body)
        self.assertIn("Attachments", author_body)
        publish_body = calls[2][calls[2].index("--body") + 1]
        self.assertIn("Hugo Extended 0.165.0", publish_body)
        self.assertIn("do-deploy", publish_body)
        self.assertIn("DigitalOcean", publish_body)


class MonitorTests(unittest.TestCase):
    def test_intakes_once_without_writing_to_the_vault(self):
        payload = io.BytesIO()
        with zipfile.ZipFile(payload, "w") as bundle:
            bundle.writestr("recording/transcript.txt", "Speaker: hello\n")
        entry = SimpleNamespace(
            id="id:abc", rev="42", name="craig_2026-10-14.zip",
            path_display="/Apps/CraigChat/craig_2026-10-14.zip", size=len(payload.getvalue()),
        )

        class Dropbox:
            def files_list_folder(self, path):
                return SimpleNamespace(entries=[entry], has_more=False, cursor="done")

            def files_download(self, path):
                return entry, SimpleNamespace(content=payload.getvalue())

        task_calls = []

        def task_creator(archive, transcript_path):
            task_calls.append((archive, transcript_path))
            return {"prepare": "t_prep", "author": "t_auth", "publish": "t_pub"}

        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            first = dropbox_monitor.run_monitor(
                Dropbox(), root / "inbox", root / "state.json", task_creator=task_creator
            )
            second = dropbox_monitor.run_monitor(
                Dropbox(), root / "inbox", root / "state.json", task_creator=task_creator
            )

            self.assertEqual(first["status"], "changed")
            self.assertEqual(first["intakes"][0]["tasks"]["author"], "t_auth")
            self.assertEqual(second, {"status": "unchanged", "new_count": 0, "intakes": []})
            self.assertEqual(len(task_calls), 1)
            self.assertEqual((root / "inbox" / "id_abc-42" / "transcript.txt").read_text(), "Speaker: hello\n")
            self.assertFalse((root / "Erovast Vault").exists())

    def test_dry_run_lists_unseen_revision_without_writes_or_tasks(self):
        entry = SimpleNamespace(
            id="id:abc", rev="42", name="craig_session.zip",
            path_display="/Apps/CraigChat/craig_session.zip", size=12,
        )

        class Dropbox:
            def files_list_folder(self, path):
                return SimpleNamespace(entries=[entry], has_more=False, cursor="done")

        def forbidden_task_creator(archive, transcript_path):
            raise AssertionError("dry-run created tasks")

        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            output = dropbox_monitor.run_monitor(
                Dropbox(), root / "inbox", root / "state.json",
                dry_run=True, task_creator=forbidden_task_creator,
            )

            self.assertEqual(output["status"], "would_change")
            self.assertEqual(output["new_count"], 1)
            self.assertEqual(list(root.iterdir()), [])

    def test_bootstrap_records_current_revisions_without_downloads_or_tasks(self):
        entry = SimpleNamespace(
            id="id:abc", rev="42", name="craig_session.zip",
            path_display="/Apps/CraigChat/craig_session.zip", size=12,
        )

        class Dropbox:
            def files_list_folder(self, path):
                return SimpleNamespace(entries=[entry], has_more=False, cursor="done")

            def files_download(self, path):
                raise AssertionError("bootstrap downloaded an archive")

        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            output = dropbox_monitor.run_monitor(
                Dropbox(), root / "inbox", root / "state.json", bootstrap=True,
                task_creator=lambda *_: (_ for _ in ()).throw(AssertionError("task created")),
            )

            state = json.loads((root / "state.json").read_text())
            self.assertEqual(output["status"], "bootstrapped")
            self.assertIn("id:abc:42", state["processed"])
            self.assertFalse((root / "inbox").exists())


if __name__ == "__main__":
    unittest.main()
