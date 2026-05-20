"""
Extract fixation transitions from eye tracking data.

Output format: {from, to, time}
- from: element being fixated on (start)
- to: next element being fixated on (destination)
- time: duration of fixation on 'from' element (ms)

Usage:
    python extract_fixation_transitions.py <input_json> [output_csv]
    python extract_fixation_transitions.py --all  # Process all JSON files in parent directory
"""

import json
import csv
import sys
import os
from pathlib import Path
from typing import List, Dict, Any


def extract_transitions(gaze_points: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Extract fixation transitions from gaze points.

    Args:
        gaze_points: List of gaze point dictionaries with elementId, timestamp, fallacyType

    Returns:
        List of transition dictionaries {from, to, time, fallacy_type, element_type}
    """
    if not gaze_points or len(gaze_points) < 2:
        return []

    transitions = []

    # Track current fixation
    current_element = gaze_points[0].get('elementId', '')
    current_fallacy = gaze_points[0].get('fallacyType', None)
    current_element_type = gaze_points[0].get('elementType', '')
    fixation_start = gaze_points[0].get('timestamp', 0)

    for i in range(1, len(gaze_points)):
        point = gaze_points[i]
        element_id = point.get('elementId', '')
        fallacy_type = point.get('fallacyType', None)
        element_type = point.get('elementType', '')
        timestamp = point.get('timestamp', 0)

        # When element changes, record the transition
        if element_id != current_element:
            dwell_time = timestamp - fixation_start

            transitions.append({
                'from': current_element if current_element else '(none)',
                'to': element_id if element_id else '(none)',
                'time': dwell_time,
                'from_fallacy_type': current_fallacy,
                'from_element_type': current_element_type,
                'to_fallacy_type': fallacy_type,
                'to_element_type': element_type
            })

            # Update for next fixation
            current_element = element_id
            current_fallacy = fallacy_type
            current_element_type = element_type
            fixation_start = timestamp

    return transitions


def extract_transitions_with_metadata(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Extract transitions along with session metadata.
    """
    metadata = data.get('metadata', {})
    gaze_points = data.get('gazeData', {}).get('points', [])

    transitions = extract_transitions(gaze_points)

    return {
        'participantId': metadata.get('participantId', 'unknown'),
        'group': metadata.get('group', 'unknown'),
        'articleTitle': metadata.get('articleTitle', 'unknown'),
        'sessionDuration': metadata.get('sessionDuration', 0),
        'totalTransitions': len(transitions),
        'transitions': transitions
    }


def categorize_element(element_id: str) -> str:
    """
    Categorize element ID into a readable type.
    """
    if not element_id or element_id == '(none)':
        return 'other'
    if 'news-sentence' in element_id:
        return 'article_text'
    if 'news-content' in element_id:
        return 'paragraph'
    if 'fnode_' in element_id:
        return 'fallacy_tag'
    if 'fallacy-image' in element_id:
        return 'chart'
    if element_id == 'title':
        return 'title'
    return 'other'


def summarize_transitions(transitions: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Create summary statistics for transitions, including fallacy-specific dwell times.
    """
    if not transitions:
        return {}

    # Count transitions by category
    category_times = {}
    category_counts = {}
    transition_pairs = {}

    # Track fallacy-specific dwell times
    fallacy_dwell_times = {}
    fallacy_fixation_counts = {}
    fallacy_text_dwell_times = {}  # Time on text that has fallacy highlighting

    for t in transitions:
        from_cat = categorize_element(t['from'])
        to_cat = categorize_element(t['to'])
        time = t['time']
        from_fallacy = t.get('from_fallacy_type')

        # Track dwell time by category
        category_times[from_cat] = category_times.get(from_cat, 0) + time
        category_counts[from_cat] = category_counts.get(from_cat, 0) + 1

        # Track transition pairs
        pair = f"{from_cat} -> {to_cat}"
        if pair not in transition_pairs:
            transition_pairs[pair] = {'count': 0, 'total_time': 0}
        transition_pairs[pair]['count'] += 1
        transition_pairs[pair]['total_time'] += time

        # Track fallacy-specific dwell times
        if from_fallacy:
            fallacy_dwell_times[from_fallacy] = fallacy_dwell_times.get(from_fallacy, 0) + time
            fallacy_fixation_counts[from_fallacy] = fallacy_fixation_counts.get(from_fallacy, 0) + 1

            # Track if this was fallacy-highlighted text vs fallacy tag
            if from_cat == 'article_text':
                fallacy_text_dwell_times[from_fallacy] = fallacy_text_dwell_times.get(from_fallacy, 0) + time

    return {
        'dwell_time_by_category': category_times,
        'fixation_count_by_category': category_counts,
        'transition_pairs': transition_pairs,
        'total_dwell_time': sum(category_times.values()),
        'total_fixations': sum(category_counts.values()),
        'fallacy_dwell_times': fallacy_dwell_times,
        'fallacy_fixation_counts': fallacy_fixation_counts,
        'fallacy_text_dwell_times': fallacy_text_dwell_times,
        'total_fallacy_dwell_time': sum(fallacy_dwell_times.values()),
        'total_fallacy_fixations': sum(fallacy_fixation_counts.values())
    }


def process_file(input_path: str, output_path: str = None) -> Dict[str, Any]:
    """
    Process a single JSON file and optionally save to CSV.
    """
    with open(input_path, 'r') as f:
        data = json.load(f)

    result = extract_transitions_with_metadata(data)
    result['summary'] = summarize_transitions(result['transitions'])

    # Save to CSV if output path provided
    if output_path:
        save_to_csv(result['transitions'], output_path, result.get('participantId', 'unknown'))

    return result


def save_to_csv(transitions: List[Dict[str, Any]], output_path: str, participant_id: str = ''):
    """
    Save transitions to CSV file.
    """
    with open(output_path, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow([
            'participant_id', 'from', 'to', 'time_ms',
            'from_category', 'to_category',
            'from_fallacy_type', 'to_fallacy_type',
            'from_element_type', 'to_element_type'
        ])

        for t in transitions:
            writer.writerow([
                participant_id,
                t['from'],
                t['to'],
                t['time'],
                categorize_element(t['from']),
                categorize_element(t['to']),
                t.get('from_fallacy_type', '') or '',
                t.get('to_fallacy_type', '') or '',
                t.get('from_element_type', '') or '',
                t.get('to_element_type', '') or ''
            ])

    print(f"Saved {len(transitions)} transitions to {output_path}")


def process_all_files(directory: str, output_dir: str = None):
    """
    Process all participant JSON files in directory.
    """
    if output_dir is None:
        output_dir = directory

    json_files = list(Path(directory).glob('skeptik_study_participant_*.json'))

    if not json_files:
        print(f"No participant files found in {directory}")
        return

    all_results = []
    all_transitions = []

    for json_file in json_files:
        print(f"Processing {json_file.name}...")
        result = process_file(str(json_file))
        all_results.append(result)

        # Add participant ID to each transition for combined output
        for t in result['transitions']:
            t['participant_id'] = result['participantId']
            t['group'] = result['group']
            all_transitions.append(t)

    # Save combined CSV
    combined_path = os.path.join(output_dir, 'all_fixation_transitions.csv')
    with open(combined_path, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow([
            'participant_id', 'group', 'from', 'to', 'time_ms',
            'from_category', 'to_category',
            'from_fallacy_type', 'to_fallacy_type',
            'from_element_type', 'to_element_type'
        ])

        for t in all_transitions:
            writer.writerow([
                t['participant_id'],
                t['group'],
                t['from'],
                t['to'],
                t['time'],
                categorize_element(t['from']),
                categorize_element(t['to']),
                t.get('from_fallacy_type', '') or '',
                t.get('to_fallacy_type', '') or '',
                t.get('from_element_type', '') or '',
                t.get('to_element_type', '') or ''
            ])

    print(f"\nCombined output saved to {combined_path}")
    print(f"Total transitions across {len(json_files)} files: {len(all_transitions)}")

    # Save summary JSON
    summary_path = os.path.join(output_dir, 'fixation_transitions_summary.json')
    summary_data = []
    for result in all_results:
        summary_data.append({
            'participantId': result['participantId'],
            'group': result['group'],
            'totalTransitions': result['totalTransitions'],
            'summary': result['summary']
        })

    with open(summary_path, 'w') as f:
        json.dump(summary_data, f, indent=2)

    print(f"Summary saved to {summary_path}")

    return all_results


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    if sys.argv[1] == '--all':
        # Process all files in parent directory (where participant JSONs are)
        script_dir = os.path.dirname(os.path.abspath(__file__))
        parent_dir = os.path.dirname(script_dir)
        process_all_files(parent_dir, script_dir)
    else:
        input_path = sys.argv[1]
        output_path = sys.argv[2] if len(sys.argv) > 2 else input_path.replace('.json', '_transitions.csv')

        result = process_file(input_path, output_path)

        print(f"\nParticipant: {result['participantId']}")
        print(f"Group: {result['group']}")
        print(f"Total transitions: {result['totalTransitions']}")
        print(f"\nSummary:")
        print(f"  Dwell time by category: {result['summary'].get('dwell_time_by_category', {})}")
        print(f"  Fixation count by category: {result['summary'].get('fixation_count_by_category', {})}")
        print(f"\nFallacy Dwell Times:")
        print(f"  By fallacy type: {result['summary'].get('fallacy_dwell_times', {})}")
        print(f"  On fallacy text: {result['summary'].get('fallacy_text_dwell_times', {})}")
        print(f"  Total fallacy dwell time: {result['summary'].get('total_fallacy_dwell_time', 0)}ms")
        print(f"  Total fallacy fixations: {result['summary'].get('total_fallacy_fixations', 0)}")


if __name__ == '__main__':
    main()
