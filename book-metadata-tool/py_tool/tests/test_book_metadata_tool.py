import pathlib
import sys
import unittest

PACKAGE_ROOT = pathlib.Path(__file__).resolve().parents[1]
if str(PACKAGE_ROOT) not in sys.path:
    sys.path.insert(0, str(PACKAGE_ROOT))

from book_metadata_tool import build_messages, parse_model_response, resolve_book


class BookMetadataToolTests(unittest.TestCase):
    def test_resolve_book_finds_local_pdf(self):
        resources_root = pathlib.Path(r"E:\OxfordTree\OxfordTree")
        resolved = resolve_book("1-01", resources_root)
        self.assertEqual(resolved["stage"], 1)
        self.assertTrue(str(resolved["pdf_path"]).endswith(r"books\stage-1\1-01.pdf"))

    def test_build_messages_uses_multimodal_payload_and_constraints(self):
        messages = build_messages(
            book_id="1-01",
            stage=1,
            total_pages=6,
            page_images=[
                {"page_number": 1, "data_url": "data:image/png;base64,AAAA"},
                {"page_number": 2, "data_url": "data:image/png;base64,BBBB"},
            ],
        )
        self.assertEqual(messages[0]["role"], "system")
        self.assertIn("valid JSON only", messages[0]["content"])
        user_content = messages[1]["content"]
        self.assertEqual(user_content[0]["type"], "image_url")
        self.assertEqual(user_content[1]["type"], "image_url")
        self.assertEqual(user_content[2]["type"], "text")
        text = user_content[2]["text"]
        self.assertIn("2-4 quiz items", text)
        self.assertIn("3-8 keywords", text)
        self.assertIn("under 6 years old", text)
        self.assertIn("0-based", text)
        self.assertIn("evidencePages", text)

    def test_parse_model_response_normalizes_quiz_items(self):
        raw = """```json
        {
          "title": "At School",
          "quizItems": [
            {
              "type": "image",
              "pageImage": 3,
              "question": "Where are the children?",
              "options": ["At school", "At home", "At the zoo"],
              "answer": 0,
              "evidencePages": [3]
            },
            {
              "type": "text",
              "question": "Who is in the story?",
              "options": ["Biff", "Chip", "Floppy"],
              "answer": 1,
              "evidencePages": [1, 2]
            }
          ],
          "keywords": ["school", "teacher", "book"]
        }
        ```"""
        parsed = parse_model_response(raw)
        self.assertEqual(parsed["title"], "At School")
        self.assertEqual(parsed["quiz"]["q1"]["answer"], 0)
        self.assertEqual(parsed["quiz"]["q2"]["answer"], 1)
        self.assertEqual(parsed["quiz"]["keywords"], ["school", "teacher", "book"])

    def test_parse_model_response_rejects_bad_answer_index(self):
        raw = """
        {
          "title": "Bad Quiz",
          "quizItems": [
            {
              "type": "text",
              "question": "Pick one.",
              "options": ["A", "B"],
              "answer": 2,
              "evidencePages": [1]
            },
            {
              "type": "text",
              "question": "Pick two.",
              "options": ["A", "B"],
              "answer": 0,
              "evidencePages": [1]
            }
          ],
          "keywords": ["one", "two", "three"]
        }
        """
        with self.assertRaisesRegex(ValueError, "answer index"):
            parse_model_response(raw)


if __name__ == "__main__":
    unittest.main()