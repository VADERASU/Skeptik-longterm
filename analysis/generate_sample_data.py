"""
Generate sample eye tracking data for testing AOI analysis.

Creates simulated control and treatment group data with expected
differences in gaze patterns.
"""

import json
import random
import os
from datetime import datetime


def generate_gaze_sequence(
    duration_seconds: int,
    has_annotations: bool,
    num_paragraphs: int = 5,
    num_sentences_per_para: int = 4
):
    """
    Generate simulated gaze data.

    Args:
        duration_seconds: Total session duration
        has_annotations: If True (treatment), more attention to fallacy areas
        num_paragraphs: Number of article paragraphs
        num_sentences_per_para: Sentences per paragraph
    """
    points = []
    timestamp = int(datetime.now().timestamp() * 1000)
    start_time = timestamp

    # Define element IDs
    sentence_ids = []
    fallacy_sentences = []

    for p in range(num_paragraphs):
        for s in range(num_sentences_per_para):
            elem_id = f"{s}-news-sentence-{p}"
            sentence_ids.append(elem_id)
            # ~20% of sentences have fallacies
            if random.random() < 0.2:
                fallacy_sentences.append(elem_id)

    tag_ids = ["fnode_BBS_0", "fnode_DIS_chart", "fnode_EMO_0"]
    chart_ids = ["fallacy-image-0", "fallacy-image-1"]

    # Simulate reading through the article
    current_para = 0
    current_sent = 0

    sample_rate = 60  # 60 Hz gaze data
    ms_per_sample = 1000 // sample_rate
    total_samples = duration_seconds * sample_rate

    for i in range(total_samples):
        timestamp += ms_per_sample

        # Determine what element we're looking at
        # Higher chance of looking at fallacies/tags if has_annotations
        elem_id = None
        x, y = 0, 0

        roll = random.random()

        if has_annotations:
            # Treatment group - more attention to fallacies and tags
            if roll < 0.25 and fallacy_sentences:
                # Look at fallacy text
                elem_id = random.choice(fallacy_sentences)
                x = random.randint(200, 800)
                y = random.randint(100, 600)
            elif roll < 0.35 and tag_ids:
                # Look at tags
                elem_id = random.choice(tag_ids)
                x = random.randint(850, 950)
                y = random.randint(100, 400)
            elif roll < 0.40 and chart_ids:
                # Look at charts
                elem_id = random.choice(chart_ids)
                x = random.randint(300, 700)
                y = random.randint(400, 600)
            else:
                # Regular reading
                if sentence_ids:
                    elem_id = sentence_ids[current_sent % len(sentence_ids)]
                x = random.randint(200, 800)
                y = random.randint(100, 600)
        else:
            # Control group - uniform reading pattern
            if roll < 0.05 and chart_ids:
                # Occasional chart glances
                elem_id = random.choice(chart_ids)
                x = random.randint(300, 700)
                y = random.randint(400, 600)
            else:
                # Regular sequential reading
                if sentence_ids:
                    elem_id = sentence_ids[current_sent % len(sentence_ids)]
                x = random.randint(200, 800)
                y = random.randint(100, 600)

        # Progress through article
        if random.random() < 0.02:  # ~2% chance to move to next sentence
            current_sent += 1
            if current_sent >= num_sentences_per_para:
                current_sent = 0
                current_para += 1

        points.append({
            "timestamp": timestamp,
            "elementId": elem_id,
            "position": {"x": x, "y": y}
        })

    return points, start_time, timestamp, fallacy_sentences


def generate_click_events(
    fallacy_sentences: list,
    has_annotations: bool,
    start_time: int
):
    """Generate click events."""
    clicks = []

    if has_annotations:
        # Treatment group clicks on more fallacy content
        num_fallacy_clicks = random.randint(3, 8)
        for _ in range(num_fallacy_clicks):
            if fallacy_sentences:
                elem_id = random.choice(fallacy_sentences)
                clicks.append({
                    "timestamp": start_time + random.randint(5000, 60000),
                    "elementId": elem_id,
                    "elementType": "fallacy-text",
                    "fallacyType": random.choice(["BBS", "DIS", "EMO"]),
                    "scrollY": random.randint(0, 1000),
                    "clickX": random.randint(200, 800),
                    "clickY": random.randint(100, 600)
                })
    else:
        # Control group - minimal clicks (no fallacy indicators)
        num_clicks = random.randint(0, 2)
        for _ in range(num_clicks):
            clicks.append({
                "timestamp": start_time + random.randint(5000, 60000),
                "elementId": f"0-news-sentence-{random.randint(0, 4)}",
                "elementType": "sentence",
                "scrollY": random.randint(0, 1000),
                "clickX": random.randint(200, 800),
                "clickY": random.randint(100, 600)
            })

    return clicks


def generate_sample_file(
    participant_id: str,
    group: str,  # 'control' or 'treatment'
    duration_seconds: int = 120,
    output_dir: str = "sample_data"
):
    """Generate a complete sample data file."""
    has_annotations = group == "treatment"

    gaze_points, start_time, end_time, fallacy_sentences = generate_gaze_sequence(
        duration_seconds=duration_seconds,
        has_annotations=has_annotations
    )

    click_events = generate_click_events(
        fallacy_sentences=fallacy_sentences,
        has_annotations=has_annotations,
        start_time=start_time
    )

    # Build dwell times
    sentence_dwell = {}
    para_dwell = {}
    for p in gaze_points:
        elem_id = p.get("elementId")
        if elem_id and "news-sentence" in elem_id:
            sentence_dwell[elem_id] = sentence_dwell.get(elem_id, 0) + 16

    data = {
        "metadata": {
            "participantId": participant_id,
            "sessionStartTime": start_time,
            "sessionEndTime": end_time,
            "sessionDuration": end_time - start_time,
            "exportTimestamp": datetime.now().isoformat(),
            "articleTitle": "Sample Article for Testing",
            "articleSource": "test_source",
            "group": group,  # Extra field for analysis
            "userAgent": "Mozilla/5.0 (Test)",
            "screenWidth": 1920,
            "screenHeight": 1080
        },
        "readingMetrics": {
            "totalReadTime": duration_seconds * 1000,
            "sentenceDwellTimes": sentence_dwell,
            "paragraphDwellTimes": para_dwell,
            "fallacyDwellTimes": {}
        },
        "gazeData": {
            "totalPoints": len(gaze_points),
            "points": gaze_points
        },
        "scrollEvents": {
            "totalEvents": random.randint(5, 20),
            "events": [
                {
                    "timestamp": start_time + i * 5000,
                    "scrollX": 0,
                    "scrollY": i * 100,
                    "viewportHeight": 900,
                    "viewportWidth": 1400,
                    "documentHeight": 2000
                }
                for i in range(random.randint(5, 15))
            ]
        },
        "clickEvents": {
            "totalClicks": len(click_events),
            "events": click_events
        },
        "fallacyInteractions": {
            "totalInteractions": len(click_events) if has_annotations else 0,
            "interactions": [
                {
                    "timestamp": c["timestamp"],
                    "fallacyKey": c.get("fallacyType", "") + "_0",
                    "fallacyName": c.get("fallacyType", "Unknown"),
                    "action": "open",
                    "level": "L1"
                }
                for c in click_events if c.get("fallacyType")
            ]
        },
        "viewportChanges": [
            {
                "timestamp": start_time,
                "viewportHeight": 900,
                "viewportWidth": 1400,
                "type": "initial"
            }
        ]
    }

    # Create output directory
    os.makedirs(output_dir, exist_ok=True)

    filename = f"{output_dir}/{group}_{participant_id}_{start_time}.json"
    with open(filename, 'w') as f:
        json.dump(data, f, indent=2)

    print(f"Generated: {filename}")
    return filename


def main():
    """Generate sample dataset with control and treatment groups."""
    output_dir = "sample_data"

    print("Generating sample eye tracking data...\n")

    # Generate control group (5 participants)
    print("Control Group (no annotations):")
    control_files = []
    for i in range(5):
        f = generate_sample_file(
            participant_id=f"P{i+1:03d}",
            group="control",
            duration_seconds=120,
            output_dir=output_dir
        )
        control_files.append(f)

    print("\nTreatment Group (with annotations):")
    treatment_files = []
    for i in range(5):
        f = generate_sample_file(
            participant_id=f"P{i+6:03d}",
            group="treatment",
            duration_seconds=120,
            output_dir=output_dir
        )
        treatment_files.append(f)

    print(f"\nGenerated {len(control_files)} control + {len(treatment_files)} treatment files")
    print(f"Files saved in: {output_dir}/")

    print("\nTo analyze:")
    print(f"  python aoi_analysis.py {output_dir}/*.json --csv -o results.csv")


if __name__ == "__main__":
    main()
