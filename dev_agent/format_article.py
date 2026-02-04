#!/usr/bin/env python3
"""
Format Article - Convert raw article text into case.json format using OpenAI

This script takes raw article text and structures it into the format required
by the Skeptik app's case.json file.

Usage:
    # From a text file
    python format_article.py --input article.txt --title "Article Title"

    # Pipe text directly
    cat article.txt | python format_article.py --title "Article Title"

    # Output to file
    python format_article.py --input article.txt --title "Title" --output case_output.json

    # Append to existing case.json
    python format_article.py --input article.txt --title "Title" --append

Requirements:
    pip install openai python-dotenv
"""

import argparse
import json
import sys
import os
from pathlib import Path

try:
    from openai import OpenAI
except ImportError:
    print("Error: openai package not installed. Run: pip install openai")
    sys.exit(1)

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# Paths
CASE_JSON_PATH = Path(__file__).parent.parent / "src" / "data" / "case.json"

# Config
MODEL = os.getenv("OPENAI_MODEL", "gpt-4o")


FORMAT_PROMPT = """You are a text formatter. Your task is to convert raw article text into a structured JSON format.

Given the article text below, create a JSON object with this exact structure:
{
    "title": "Article Title",
    "sub-title": "",
    "content": [
        {
            "id": 1,
            "hasImage": false,
            "text": "First paragraph text..."
        },
        {
            "id": 2,
            "hasImage": false,
            "text": "Second paragraph text..."
        }
    ]
}

Rules:
1. Split the text into logical paragraphs (each paragraph becomes a content item)
2. Each paragraph should be a coherent unit of thought (not too short, not too long)
3. Preserve the original text exactly - do not paraphrase or summarize
4. Number paragraphs sequentially starting from 1
5. Set "hasImage" to false for all paragraphs (images will be added manually later)
6. If a title is provided, use it. Otherwise, extract or infer the title from the text
7. Keep paragraphs in their original order
8. Do not include author bylines, dates, or metadata in the content paragraphs
9. If the text has natural paragraph breaks, respect them
10. Aim for paragraphs of 1-4 sentences each

Article Title: {title}

Article Text:
{text}

Output ONLY the JSON object, no other text."""


def format_article(client: OpenAI, text: str, title: str, model: str) -> dict:
    """
    Use OpenAI to format raw article text into case.json structure.
    """
    prompt = FORMAT_PROMPT.format(title=title, text=text)

    print(f"Formatting article with {model}...", file=sys.stderr)

    response = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.1,
        response_format={"type": "json_object"}
    )

    output_text = response.choices[0].message.content.strip()
    result = json.loads(output_text)

    return result


def load_existing_cases() -> dict:
    """Load existing case.json file."""
    if CASE_JSON_PATH.exists():
        with open(CASE_JSON_PATH, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {"cases": []}


def save_cases(data: dict):
    """Save to case.json file."""
    with open(CASE_JSON_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4, ensure_ascii=False)
    print(f"Saved to: {CASE_JSON_PATH}", file=sys.stderr)


def main():
    parser = argparse.ArgumentParser(
        description="Convert raw article text into case.json format using OpenAI",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    # Format from file
    python format_article.py --input article.txt --title "My Article Title"

    # Pipe text
    cat article.txt | python format_article.py --title "Title"

    # Save to specific file
    python format_article.py --input article.txt --title "Title" -o formatted.json

    # Append directly to case.json
    python format_article.py --input article.txt --title "Title" --append
"""
    )
    parser.add_argument(
        "--input", "-i",
        help="Input file containing raw article text (reads from stdin if not provided)"
    )
    parser.add_argument(
        "--title", "-t",
        default="Untitled Article",
        help="Article title (default: 'Untitled Article')"
    )
    parser.add_argument(
        "--subtitle", "-s",
        default="",
        help="Article subtitle (optional)"
    )
    parser.add_argument(
        "--output", "-o",
        help="Output file (prints to stdout if not provided)"
    )
    parser.add_argument(
        "--append", "-a",
        action="store_true",
        help="Append to existing src/data/case.json"
    )
    parser.add_argument(
        "--model", "-m",
        default=MODEL,
        help=f"OpenAI model to use (default: {MODEL})"
    )

    args = parser.parse_args()

    # Check for API key
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("Error: OPENAI_API_KEY environment variable not set", file=sys.stderr)
        sys.exit(1)

    # Read input text
    if args.input:
        input_path = Path(args.input)
        if not input_path.exists():
            print(f"Error: Input file not found: {args.input}", file=sys.stderr)
            sys.exit(1)
        article_text = input_path.read_text(encoding="utf-8").strip()
    else:
        if sys.stdin.isatty():
            print("Error: No input file specified and no piped input detected", file=sys.stderr)
            print("Use --input or pipe text to stdin", file=sys.stderr)
            sys.exit(1)
        article_text = sys.stdin.read().strip()

    if len(article_text) < 50:
        print("Error: Input text is too short (minimum 50 characters)", file=sys.stderr)
        sys.exit(1)

    # Initialize OpenAI client
    client = OpenAI(api_key=api_key)

    # Format the article
    print(f"Processing article: {args.title}", file=sys.stderr)
    print(f"Text length: {len(article_text)} characters", file=sys.stderr)
    print("-" * 40, file=sys.stderr)

    result = format_article(client, article_text, args.title, args.model)

    # Override title/subtitle if provided
    if args.title != "Untitled Article":
        result["title"] = args.title
    if args.subtitle:
        result["sub-title"] = args.subtitle

    # Count paragraphs
    num_paragraphs = len(result.get("content", []))
    print(f"Created {num_paragraphs} paragraphs", file=sys.stderr)

    # Handle output
    if args.append:
        # Append to existing case.json
        existing = load_existing_cases()
        existing["cases"].append(result)
        save_cases(existing)
        print(f"Appended as case index: {len(existing['cases']) - 1}", file=sys.stderr)
    elif args.output:
        # Save to specified file
        output_path = Path(args.output)
        output_path.write_text(json.dumps(result, indent=4, ensure_ascii=False), encoding="utf-8")
        print(f"Output saved to: {args.output}", file=sys.stderr)
    else:
        # Print to stdout
        print(json.dumps(result, indent=4, ensure_ascii=False))

    print("-" * 40, file=sys.stderr)
    print("Formatting complete!", file=sys.stderr)


if __name__ == "__main__":
    main()
