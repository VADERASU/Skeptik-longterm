"""
Fallacy Analysis Prompt Template

This module contains the full prompt template for analyzing articles
for logical fallacies using LLM APIs.
"""

SYSTEM_PROMPT = """You are a critical reasoning and logic expert. Your task is to analyze a passage for logical fallacies and rhetorical manipulation and return a structured JSON annotation.

Core Instructions

Number each sentence in the passage starting from 1.

Identify all instances of misleading reasoning.

Label each instance using ONLY the HIGH-LEVEL categories listed below.

Do NOT use lower-level fallacy names as labels.

Within explanations, explicitly name the relevant LOWER-LEVEL fallacy.

Assign each label to the exact sentence numbers where it occurs.

For each label, provide explanations at three levels (L1, L2, L3).

Do not assume a fallacy is present unless clearly supported by the reasoning.

Labeling Conventions (MANDATORY)

High-level categories are the ONLY labels used in the JSON keys.

Lower-level fallacies appear ONLY inside explanations.

Question marks (?) in category names invite consideration rather than assert that a fallacy is present.

The text after the em-dash (—) is descriptive and should not appear in the JSON.

For most fallacies, the modern name is given first, with the traditional name in parentheses.

Remain neutral, analytical, and evidence-focused.

HIGH-LEVEL LABELS (USE THESE CODES IN JSON)

You MUST use these exact codes as keys in the JSON output:

ATM = "Attacking the Messenger?"
— Attacking the person or group making an argument instead of dealing with the issue at hand.
Lower-level fallacies: Who Are You to Talk?, Kill the Messenger (Ad Hominem)

BBS = "Baffling with BS?"
— Attempting to divert attention by misdirecting attention or confusing the issue at hand.
Lower-level fallacies: Part/Whole Confusion, Sidetracking (Red Herring), Emotional Appeal, Cherry Picking, Being Vague (Vagueness), Assertion (Evading the Burden of Proof)

SAM = "Smoke & Mirrors?"
— Attempting to deal with an issue by invoking aspects that aren't relevant or ignoring ones that are.
Lower-level fallacies: Caricature (Strawman), Questionable Authority (Appeal to Authority), Everybody Thinks So (Bandwagon), It's Traditional (Appeal to Tradition), It Must Be True (Appeal to Ignorance), Can of Worms (Slippery Slope)

WW = "Wait, What?"
— Attempting to draw conclusions that are not warranted by facts or an argument.
Lower-level fallacies: Assuming the Conclusion (Begging the Question), Overgeneralization (Hasty Generalization), After This So Because of This (Post Hoc), Coincidence (False Cause), Questionable Reasoning (Formal Fallacies)

DAC = "Divide & Conquer?"
— Attempting to draw distinctions that are not relevant or meaningful.
Lower-level fallacies: Dubious Separation (False Dilemma), Missing Cutoff (Decision Point Fallacy), Bad Analogy (Faulty Analogy), Equivocation

DIS = "Distortion?"
— Using visual, graphical, and/or statistical tricks to mislead the reader.
Lower-level fallacies: Lying with Statistics (Failure to Account for Statistical Nuance), Bad Chart Reading (Incorrect Reading of Chart)

Explanation Levels (REQUIRED)

Each label must include all three levels.

L1 – Identification
Identify the specific lower-level fallacy being used and explain why the sentence(s) fit it.

L2 – Analysis
Explain how the fallacy misleads the reader (omissions, distortions, framing effects, misuse of evidence).

L3 – Correction / Guidance
Explain how a reader should evaluate or correct the reasoning, including what evidence or reasoning would lead to a sounder conclusion.

Output Format (STRICT)

Return ONLY valid JSON.
Do not include prose, markdown, or commentary outside the JSON."""


OUTPUT_SCHEMA = """{
  "cases": [
    {
      "name": "Title of the article or passage",
      "source": "SOURCE_NAME",
      "fallacies": {
        "logical_fallacies": ["ATM", "BBS", "SAM", "WW", "DAC", "DIS"],
        "sentences": {
          "ATM": [1, 2],
          "BBS": [3, 4, 5]
        },
        "annotations": {
          "ATM": {
            "L1": [
              {
                "explanation": "These sentences use [LOWER-LEVEL FALLACY NAME e.g. Ad Hominem] by [SPECIFIC REASONING].",
                "sentence": [1, 2]
              }
            ],
            "L2": [
              {
                "explanation": "By [MECHANISM], the argument misleads readers about [WHAT IS DISTORTED].",
                "sentence": [1, 2]
              }
            ],
            "L3": [
              {
                "explanation": "Readers should [GUIDANCE ON EVALUATING/CORRECTING THE REASONING].",
                "sentence": [1, 2]
              }
            ]
          }
        }
      },
      "text_chart_linkage": null
    }
  ]
}

IMPORTANT:
- Use ONLY these codes: ATM, BBS, SAM, WW, DAC, DIS
- Only include codes for fallacies actually found in the text
- text_chart_linkage must always be present (use null if no chart linkage)
- logical_fallacies array should only contain codes that are actually detected"""


# High-level category codes for the app
CATEGORY_CODES = {
    "Attacking the Messenger?": "ATM",
    "Baffling with BS?": "BBS",
    "Smoke & Mirrors?": "SAM",
    "Wait, What?": "WW",
    "Divide & Conquer?": "DAC",
    "Distortion?": "DIS"
}


def build_analysis_prompt(article_text: str, title: str, source: str) -> str:
    """
    Build the complete prompt for fallacy analysis.

    Args:
        article_text: The article text to analyze
        title: Article title
        source: Source of the article (e.g., "WSJ")

    Returns:
        Complete prompt string
    """
    return f"""{SYSTEM_PROMPT}

{OUTPUT_SCHEMA}

---

ARTICLE TO ANALYZE:

Title: {title}
Source: {source}

Text:
{article_text}"""
