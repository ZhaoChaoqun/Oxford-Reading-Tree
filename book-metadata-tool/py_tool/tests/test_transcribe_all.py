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


def _seg(text, start=0.0, end=1.0):
    return {"start": start, "end": end, "text": text}


class StripIntroTests(unittest.TestCase):
    def test_drops_every_trailing_intro_segment(self):
        # Regression: the narration is often split across several segments.
        # Stopping at the first match left "Let's look at the pictures
        # together..." in front of the story.
        segments = [
            _seg("When you hear this sound, turn the page."),
            _seg("Now open the book."),
            _seg("Let's look at the pictures together and see what will happen in this story."),
            _seg("Dad took Kipper to the bathroom to cut his hair."),
        ]

        kept, found = transcribe_all.strip_intro(segments)

        self.assertTrue(found)
        self.assertEqual(
            [s["text"] for s in kept],
            ["Dad took Kipper to the bathroom to cut his hair."],
        )

    def test_drops_title_slate_credits(self):
        segments = [
            _seg("Now open the book."),
            _seg("Pond Dipping written by Roger Hunt and illustrated by Alex Brychta."),
            _seg("Wilf and Wilma were at the pond."),
        ]

        kept, found = transcribe_all.strip_intro(segments)

        self.assertTrue(found)
        self.assertEqual([s["text"] for s in kept], ["Wilf and Wilma were at the pond."])

    def test_keeps_story_that_starts_immediately(self):
        segments = [_seg("It was Kipper's first day."), _seg("He held on.")]

        kept, found = transcribe_all.strip_intro(segments)

        self.assertFalse(found)
        self.assertEqual(len(kept), 2)

    def test_never_returns_empty_story(self):
        segments = [_seg("Now open the book."), _seg("Let's read the story together.")]

        kept, found = transcribe_all.strip_intro(segments)

        self.assertTrue(found)
        self.assertEqual(len(kept), 1)

    def test_ignores_intro_phrases_after_story_starts(self):
        segments = [
            _seg("Now open the book."),
            _seg("Biff turned the page of her book."),
        ]

        kept, found = transcribe_all.strip_intro(segments)

        self.assertTrue(found)
        self.assertEqual([s["text"] for s in kept], ["Biff turned the page of her book."])


    def test_keeps_story_when_no_intro_phrase_matches(self):
        # Regression: the old fallback dropped the first two segments whenever
        # no phrase matched, which deleted real story content for the majority
        # of transcripts (165 of 244 contain no intro phrase at all).
        segments = [
            _seg("It was Kipper's first day at school."),
            _seg("I want to go. Come on, Kipper."),
            _seg("Kipper played in the home corner."),
        ]

        kept, found = transcribe_all.strip_intro(segments)

        self.assertFalse(found)
        self.assertEqual([s["text"] for s in kept], [s["text"] for s in segments])

    def test_single_segment_story_is_never_emptied(self):
        segments = [_seg("Kipper")]

        kept, found = transcribe_all.strip_intro(segments)

        self.assertFalse(found)
        self.assertEqual(len(kept), 1)

    def test_is_idempotent(self):
        segments = [
            _seg("When you hear this sound, turn the page."),
            _seg("Now open the book."),
            _seg("Let's look at the pictures together and see what will happen in this story."),
            _seg("Dad took Kipper to the bathroom to cut his hair."),
            _seg("Ouch! Ouch!"),
        ]

        once, found = transcribe_all.strip_intro(segments)
        twice, found_again = transcribe_all.strip_intro(once)

        self.assertTrue(found)
        self.assertFalse(found_again)
        self.assertEqual([s["text"] for s in once], [s["text"] for s in twice])
        self.assertEqual(
            [s["text"] for s in twice],
            ["Dad took Kipper to the bathroom to cut his hair.", "Ouch! Ouch!"],
        )


if __name__ == "__main__":
    unittest.main()