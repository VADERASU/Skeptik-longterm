#!/usr/bin/env python3
"""
Fallacy Analyzer - Analyze articles for logical fallacies using GPT-4

This script takes article text and returns structured JSON annotations
compatible with the Skeptik app's cases.json format.

Usage:
    python fallacy_analyzer.py --input article.txt --title "Article Title" --source "WSJ"

    # Or pipe text directly:
    echo "Article text..." | python fallacy_analyzer.py --title "Title" --source "Source"

    # Output to file:
    python fallacy_analyzer.py --input article.txt --title "Title" --source "WSJ" --output result.json

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
    pass  # dotenv is optional if OPENAI_API_KEY is set in environment

from prompt_template import build_analysis_prompt, CATEGORY_CODES


# -------------------------
# CONFIG
# -------------------------
MODEL = os.getenv("OPENAI_MODEL", "gpt-4o")
MAX_RETRIES = 2


def analyze_article(client: OpenAI, article_text: str, title: str, source: str, model: str = MODEL) -> dict:
    """
    Send article to GPT-4 for fallacy analysis.

    Args:
        client: OpenAI client instance
        article_text: The article text to analyze
        title: Article title
        source: Source name (e.g., "WSJ")
        model: OpenAI model to use

    Returns:
        Parsed JSON response from GPT-4
    """
    prompt = build_analysis_prompt(article_text, title, source)

    for attempt in range(MAX_RETRIES + 1):
        try:
            print(f"Sending to {model} (attempt {attempt + 1}/{MAX_RETRIES + 1})...", file=sys.stderr)

            response = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                response_format={"type": "json_object"}
            )

            output_text = response.choices[0].message.content.strip()

            # Parse JSON
            result = json.loads(output_text)

            # Validate structure
            if "cases" not in result:
                raise ValueError("Response missing 'cases' key")

            return result

        except json.JSONDecodeError as e:
            print(f"JSON parse error on attempt {attempt + 1}: {e}", file=sys.stderr)
            if attempt == MAX_RETRIES:
                print("Raw output:", file=sys.stderr)
                print(output_text, file=sys.stderr)
                raise
        except Exception as e:
            print(f"Error on attempt {attempt + 1}: {e}", file=sys.stderr)
            if attempt == MAX_RETRIES:
                raise

    return None


def transform_for_app(result: dict) -> dict:
    """
    Transform LLM output to ensure compatibility with the Skeptik app.

    The app uses short codes (like "ATM", "BBS") in config.json,
    but the LLM outputs full category names. This function can
    optionally convert between them.

    Args:
        result: The raw LLM response

    Returns:
        Transformed result (currently returns as-is since app can handle full names)
    """
    # The app can handle full category names as labels
    # If you need to convert to short codes, uncomment the conversion logic below

    # for case in result.get("cases", []):
    #     fallacies = case.get("fallacies", {})
    #
    #     # Convert logical_fallacies list
    #     new_fallacies = []
    #     for label in fallacies.get("logical_fallacies", []):
    #         code = CATEGORY_CODES.get(label, label)
    #         new_fallacies.append(code)
    #     fallacies["logical_fallacies"] = new_fallacies
    #
    #     # Convert sentences dict keys
    #     new_sentences = {}
    #     for label, sents in fallacies.get("sentences", {}).items():
    #         code = CATEGORY_CODES.get(label, label)
    #         new_sentences[code] = sents
    #     fallacies["sentences"] = new_sentences
    #
    #     # Convert annotations dict keys
    #     new_annotations = {}
    #     for label, annot in fallacies.get("annotations", {}).items():
    #         code = CATEGORY_CODES.get(label, label)
    #         new_annotations[code] = annot
    #     fallacies["annotations"] = new_annotations

    return result


def extract_case_for_casejson(result: dict) -> dict:
    """
    Extract just the case object (without the outer 'cases' array wrapper)
    for direct insertion into cases.json.

    Args:
        result: Full LLM response with 'cases' array

    Returns:
        Single case object ready to append to cases.json
    """
    cases = result.get("cases", [])
    if cases:
        return cases[0]
    return result


def main():
    parser = argparse.ArgumentParser(
        description="Analyze articles for logical fallacies using GPT-4",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    # Analyze from file
    python fallacy_analyzer.py --input article.txt --title "Article Title" --source "WSJ"

    # Pipe text directly
    cat article.txt | python fallacy_analyzer.py --title "Title" --source "Source"

    # Save output to file
    python fallacy_analyzer.py --input article.txt --title "Title" --source "WSJ" -o result.json

    # Output just the case object (for copying into cases.json)
    python fallacy_analyzer.py --input article.txt --title "Title" --source "WSJ" --case-only
"""
    )
    parser.add_argument(
        "--input", "-i",
        help="Input file containing article text (reads from stdin if not provided)"
    )
    parser.add_argument(
        "--title", "-t",
        required=True,
        help="Article title"
    )
    parser.add_argument(
        "--source", "-s",
        required=True,
        help="Article source (e.g., 'WSJ', 'NYT')"
    )
    parser.add_argument(
        "--output", "-o",
        help="Output file (prints to stdout if not provided)"
    )
    parser.add_argument(
        "--case-only",
        action="store_true",
        help="Output only the case object (without 'cases' wrapper) for direct insertion into cases.json"
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
        print("Either set the environment variable or create a .env file", file=sys.stderr)
        sys.exit(1)

    # Read input text
    if args.input:
        input_path = Path(args.input)
        if not input_path.exists():
            print(f"Error: Input file not found: {args.input}", file=sys.stderr)
            sys.exit(1)
        article_text = input_path.read_text(encoding="utf-8").strip()
    else:
        # Read from stdin
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

    # Use specified model
    model = args.model

    # Analyze article
    print(f"Analyzing article: {args.title}", file=sys.stderr)
    print(f"Source: {args.source}", file=sys.stderr)
    print(f"Text length: {len(article_text)} characters", file=sys.stderr)
    print("-" * 40, file=sys.stderr)

    result = analyze_article(client, article_text, args.title, args.source, model)

    if result is None:
        print("Error: Analysis failed", file=sys.stderr)
        sys.exit(1)

    # Transform for app compatibility
    result = transform_for_app(result)

    # Extract case object if requested
    if args.case_only:
        output = extract_case_for_casejson(result)
    else:
        output = result

    # Format output
    json_output = json.dumps(output, indent=2, ensure_ascii=False)

    # Write output
    if args.output:
        output_path = Path(args.output)
        output_path.write_text(json_output, encoding="utf-8")
        print(f"Output saved to: {args.output}", file=sys.stderr)
    else:
        print(json_output)

    print("-" * 40, file=sys.stderr)
    print("Analysis complete!", file=sys.stderr)

    # Print summary
    cases = result.get("cases", [result]) if "cases" in result else [result]
    for case in cases:
        fallacies = case.get("fallacies", {})
        labels = fallacies.get("logical_fallacies", [])
        print(f"Found {len(labels)} fallacy categories: {', '.join(labels)}", file=sys.stderr)


if __name__ == "__main__":
    main()
