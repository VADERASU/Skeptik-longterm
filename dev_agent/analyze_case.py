#!/usr/bin/env python3
"""
Analyze Case - Read from case.json and generate cases.json fallacy annotations

This script reads article(s) from src/data/case.json and generates
fallacy analysis output for src/resource/cases.json

Usage:
    # Analyze a specific case by index (0-based)
    python analyze_case.py --case 0

    # Analyze all cases
    python analyze_case.py --all

    # Save output to file
    python analyze_case.py --case 0 --output cases_output.json
"""

import argparse
import json
import sys
import os
import re
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

from prompt_template import build_analysis_prompt

# Paths
CASE_JSON_PATH = Path(__file__).parent.parent / "src" / "data" / "case.json"
CASES_JSON_PATH = Path(__file__).parent.parent / "src" / "resource" / "cases.json"

# Config
MODEL = os.getenv("OPENAI_MODEL", "gpt-4o")
MAX_RETRIES = 2


def load_case_json():
    """Load the case.json file."""
    if not CASE_JSON_PATH.exists():
        print(f"Error: case.json not found at {CASE_JSON_PATH}", file=sys.stderr)
        sys.exit(1)

    with open(CASE_JSON_PATH, 'r', encoding='utf-8') as f:
        return json.load(f)


def split_into_sentences(text):
    """
    Split text into sentences using the EXACT same logic as the frontend.
    Frontend regex: /([.?!(.\))])\s*(?=[A-Z])/g

    This matches the JavaScript: e.text.replace(/([.?!(.\))])\s*(?=[A-Z])/g, "$1|").split("|")
    """
    # Replicate the frontend's replace + split approach exactly
    # The regex matches: . ? ! ( ) followed by optional whitespace and capital letter
    pattern = r'([.?!()])\s*(?=[A-Z])'

    # Replace with delimiter like frontend does
    marked = re.sub(pattern, r'\1|', text)
    sentences = marked.split('|')

    return [s.strip() for s in sentences if s.strip()]


def split_paragraphs_into_sentences(paragraphs):
    """
    Split each paragraph into sentences, preserving paragraph boundaries.
    Each paragraph always starts a new sentence.
    """
    all_sentences = []
    for para in paragraphs:
        para_sentences = split_into_sentences(para)
        all_sentences.extend(para_sentences)
    return all_sentences


def extract_article_text(case):
    """Extract full article text from a case's content array."""
    paragraphs = []
    for content_block in case.get('content', []):
        text = content_block.get('text', '')
        if text:
            paragraphs.append(text)
    return '\n\n'.join(paragraphs)


def extract_numbered_sentences(case):
    """
    Extract article text and split into numbered sentences.
    Returns tuple: (numbered_text, sentence_count)
    """
    paragraphs = []
    for content_block in case.get('content', []):
        text = content_block.get('text', '')
        if text:
            paragraphs.append(text)

    sentences = split_paragraphs_into_sentences(paragraphs)

    numbered_lines = []
    for i, sentence in enumerate(sentences, 1):
        numbered_lines.append(f"[{i}] {sentence}")

    return '\n'.join(numbered_lines), len(sentences)


def analyze_article(client: OpenAI, article_text: str, title: str, source: str, model: str) -> dict:
    """Send article to GPT-4 for fallacy analysis."""
    prompt = build_analysis_prompt(article_text, title, source)

    for attempt in range(MAX_RETRIES + 1):
        try:
            print(f"  Sending to {model} (attempt {attempt + 1}/{MAX_RETRIES + 1})...", file=sys.stderr)

            response = client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                response_format={"type": "json_object"}
            )

            output_text = response.choices[0].message.content.strip()
            result = json.loads(output_text)

            if "cases" not in result:
                raise ValueError("Response missing 'cases' key")

            return result

        except json.JSONDecodeError as e:
            print(f"  JSON parse error on attempt {attempt + 1}: {e}", file=sys.stderr)
            if attempt == MAX_RETRIES:
                print("  Raw output:", file=sys.stderr)
                print(output_text, file=sys.stderr)
                raise
        except Exception as e:
            print(f"  Error on attempt {attempt + 1}: {e}", file=sys.stderr)
            if attempt == MAX_RETRIES:
                raise

    return None


def main():
    parser = argparse.ArgumentParser(
        description="Analyze articles from case.json for logical fallacies",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    # Analyze first case (index 0)
    python analyze_case.py --case 0

    # Analyze all cases
    python analyze_case.py --all

    # Save to file
    python analyze_case.py --case 0 --output result.json

    # List available cases
    python analyze_case.py --list
"""
    )
    parser.add_argument("--case", "-c", type=int, help="Case index to analyze (0-based)")
    parser.add_argument("--all", "-a", action="store_true", help="Analyze all cases")
    parser.add_argument("--list", "-l", action="store_true", help="List available cases")
    parser.add_argument("--output", "-o", help="Output file (prints to stdout if not provided)")
    parser.add_argument("--source", "-s", default="Article", help="Source name (default: 'Article')")
    parser.add_argument("--model", "-m", default=MODEL, help=f"OpenAI model (default: {MODEL})")
    parser.add_argument("--prompt-only", "-p", action="store_true",
                        help="Output the prompt for manual use in ChatGPT (no API call)")

    args = parser.parse_args()

    # Load case.json
    case_data = load_case_json()
    cases = case_data.get('cases', [])

    # List mode
    if args.list:
        print("Available cases in case.json:")
        for i, case in enumerate(cases):
            title = case.get('title', 'Untitled')
            print(f"  [{i}] {title}")
        return

    # Validate arguments
    if args.case is None and not args.all:
        print("Error: Specify --case INDEX or --all", file=sys.stderr)
        print("Use --list to see available cases", file=sys.stderr)
        sys.exit(1)

    # Prompt-only mode doesn't need API key
    if not args.prompt_only:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            print("Error: OPENAI_API_KEY environment variable not set", file=sys.stderr)
            sys.exit(1)
        client = OpenAI(api_key=api_key)
    else:
        client = None

    # Determine which cases to analyze
    if args.all:
        indices = list(range(len(cases)))
    else:
        if args.case < 0 or args.case >= len(cases):
            print(f"Error: Case index {args.case} out of range (0-{len(cases)-1})", file=sys.stderr)
            sys.exit(1)
        indices = [args.case]

    # Analyze cases
    results = []
    for idx in indices:
        case = cases[idx]
        title = case.get('title', 'Untitled')

        print(f"\n{'='*60}", file=sys.stderr)
        print(f"Analyzing case [{idx}]: {title}", file=sys.stderr)
        print(f"{'='*60}", file=sys.stderr)

        numbered_text, sentence_count = extract_numbered_sentences(case)
        print(f"  Text length: {len(numbered_text)} characters", file=sys.stderr)
        print(f"  Sentence count: {sentence_count}", file=sys.stderr)

        # Prompt-only mode: print prompt and continue
        if args.prompt_only:
            prompt = build_analysis_prompt(numbered_text, title, args.source)
            print(f"\n{'='*60}", file=sys.stderr)
            print("COPY THE PROMPT BELOW INTO CHATGPT:", file=sys.stderr)
            print(f"{'='*60}\n", file=sys.stderr)
            print(prompt)
            print(f"\n{'='*60}", file=sys.stderr)
            print("After getting the response, save the JSON to cases.json", file=sys.stderr)
            continue

        result = analyze_article(client, numbered_text, title, args.source, args.model)

        if result and 'cases' in result and len(result['cases']) > 0:
            case_result = result['cases'][0]

            # Ensure text_chart_linkage is always present
            if 'text_chart_linkage' not in case_result:
                case_result['text_chart_linkage'] = None

            results.append(case_result)

            # Print summary
            fallacies = case_result.get('fallacies', {})
            labels = fallacies.get('logical_fallacies', [])
            print(f"  Found {len(labels)} fallacy categories: {', '.join(labels)}", file=sys.stderr)
        else:
            print(f"  Warning: No results for case {idx}", file=sys.stderr)

    # Format output
    output = {"cases": results}
    json_output = json.dumps(output, indent=2, ensure_ascii=False)

    # Write output
    if args.output:
        output_path = Path(args.output)
        output_path.write_text(json_output, encoding="utf-8")
        print(f"\nOutput saved to: {args.output}", file=sys.stderr)
    else:
        print(json_output)

    print(f"\n{'='*60}", file=sys.stderr)
    print(f"Analysis complete! Processed {len(results)} case(s)", file=sys.stderr)
    print(f"Copy the output to src/resource/cases.json", file=sys.stderr)


if __name__ == "__main__":
    main()
