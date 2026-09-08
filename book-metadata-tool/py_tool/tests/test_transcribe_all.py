import pathlib
import sys
import unittest

PACKAGE_ROOT = pathlib.Path(__file__).resolve().parents[1]
if str(PACKAGE_ROOT) not in sys.path:
    sys.path.insert(0, str(PACKAGE_ROOT))

import transcribe_all


class TranscribeAllDefaultsTests(unittest.TestCase):
    def test_default_resources_root_points_to_books_directory(self):
        self.assertEqual(
            transcribe_all.RESOURCES_ROOT,
            pathlib.Path(r"E:\OxfordTree\OxfordTree\books"),
        )

    def test_books_json_write_is_opt_in(self):
        parser = transcribe_all.build_parser()
        args = parser.parse_args([])
        self.assertFalse(args.write_books_json)

    def test_write_books_json_flag_enables_output(self):
        parser = transcribe_all.build_parser()
        args = parser.parse_args(["--write-books-json"])
        self.assertTrue(args.write_books_json)


if __name__ == "__main__":
    unittest.main()