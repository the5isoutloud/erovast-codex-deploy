import tempfile
import unittest
from pathlib import Path

from scripts import check_vault


class VaultCheckerTests(unittest.TestCase):
    def test_reports_missing_attachment_and_unclosed_frontmatter(self):
        with tempfile.TemporaryDirectory() as directory:
            vault = Path(directory)
            (vault / "Attachments").mkdir()
            (vault / "Broken.md").write_text("---\ntags: [lore]\n![[missing.png]]\n")

            errors = check_vault.validate_vault(vault)

            self.assertTrue(any("front matter" in error for error in errors))
            self.assertTrue(any("missing attachment" in error for error in errors))

    def test_accepts_resolved_wikilink_and_attachment(self):
        with tempfile.TemporaryDirectory() as directory:
            vault = Path(directory)
            (vault / "Attachments").mkdir()
            (vault / "Attachments" / "portrait.png").write_bytes(b"png")
            (vault / "Target.md").write_text("# Target\n")
            (vault / "Source.md").write_text(
                "---\ntags:\n  - lore\n---\n[[Target#Heading|target]] ![[portrait.png|300]]\n"
            )

            self.assertEqual(check_vault.validate_vault(vault), [])

    def test_resolves_note_names_containing_dots(self):
        with tempfile.TemporaryDirectory() as directory:
            vault = Path(directory)
            (vault / "2026.10.06.md").write_text("# Session\n")
            (vault / "Index.md").write_text("[[2026.10.06]]\n")

            self.assertEqual(check_vault.validate_vault(vault), [])

    def test_resolves_escaped_alias_separator(self):
        with tempfile.TemporaryDirectory() as directory:
            vault = Path(directory)
            (vault / "Thornwood Vale.md").write_text("# Vale\n")
            (vault / "Index.md").write_text(r"[[Thornwood Vale\|the Vale]]" + "\n")

            self.assertEqual(check_vault.validate_vault(vault), [])

    def test_reports_missing_markdown_and_html_image_paths(self):
        with tempfile.TemporaryDirectory() as directory:
            vault = Path(directory)
            (vault / "Source.md").write_text(
                '![one](Attachments/missing.png)\n<img src="Attachments/other.png">\n'
            )

            errors = check_vault.validate_vault(vault)

            self.assertEqual(len(errors), 2)
            self.assertTrue(all("missing attachment path" in error for error in errors))


if __name__ == "__main__":
    unittest.main()
