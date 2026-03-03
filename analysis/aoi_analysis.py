"""
AOI (Areas of Interest) Analysis for Skeptik Eye Tracking Data

This script processes exported gaze data from Skeptik and calculates
fixation metrics within predefined Areas of Interest (AOIs).

AOI Categories:
1. Fallacy-highlighted text - Text marked with fallacy annotations
2. Fallacy tags - Sidebar tags showing fallacy types
3. Chart/Image areas - Charts and images with fallacy annotations
4. Regular text - Non-annotated text content

Usage:
    python aoi_analysis.py <exported_json_file> [--output <output_file>]

Example:
    python aoi_analysis.py participant_001_1708123456.json --output results.csv
"""

import json
import argparse
import csv
from collections import defaultdict
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple
import statistics


@dataclass
class AOI:
    """Represents an Area of Interest"""
    name: str
    category: str  # 'fallacy_text', 'fallacy_tag', 'chart', 'regular_text'
    element_ids: List[str] = field(default_factory=list)
    fallacy_type: Optional[str] = None


@dataclass
class Fixation:
    """Represents a fixation (cluster of gaze points)"""
    start_time: int
    end_time: int
    duration: int  # milliseconds
    x: float
    y: float
    element_id: Optional[str]
    aoi_category: Optional[str]


@dataclass
class AOIMetrics:
    """Metrics for a single AOI"""
    aoi_name: str
    category: str
    fixation_count: int = 0
    total_dwell_time: int = 0  # milliseconds
    mean_fixation_duration: float = 0.0
    first_fixation_time: Optional[int] = None  # time from session start
    revisits: int = 0  # number of times returned to this AOI
    fixation_durations: List[int] = field(default_factory=list)


class AOIAnalyzer:
    """
    Analyzes gaze data to compute metrics for Areas of Interest.

    Fixation Detection:
    - Uses velocity-based fixation detection
    - A fixation is detected when gaze stays within a threshold distance
      for a minimum duration (default: 100ms)
    """

    # Fixation detection parameters
    FIXATION_RADIUS_PX = 50  # pixels - gaze must stay within this radius
    MIN_FIXATION_DURATION_MS = 100  # minimum fixation duration

    def __init__(self, data: dict):
        self.data = data
        self.gaze_points = data.get('gazeData', {}).get('points', [])
        self.click_events = data.get('clickEvents', {}).get('events', [])
        self.session_start = data.get('metadata', {}).get('sessionStartTime', 0)
        self.aois: List[AOI] = []
        self.fixations: List[Fixation] = []

    def define_aois_from_data(self):
        """
        Auto-define AOIs based on elements found in gaze data.
        Categories are determined by element ID patterns.
        """
        element_ids = set()
        for point in self.gaze_points:
            if point.get('elementId'):
                element_ids.add(point['elementId'])

        # Also get elements from click events
        for click in self.click_events:
            if click.get('elementId'):
                element_ids.add(click['elementId'])

        # Categorize elements into AOIs
        fallacy_text_ids = []
        regular_text_ids = []
        image_ids = []
        tag_ids = []

        for elem_id in element_ids:
            if not elem_id:
                continue

            # Fallacy text elements have data-fallacy attribute (shown in element ID patterns)
            if 'news-sentence' in elem_id:
                # Check if this is a fallacy sentence by looking at click data
                is_fallacy = any(
                    c.get('elementId') == elem_id and c.get('fallacyType')
                    for c in self.click_events
                )
                if is_fallacy:
                    fallacy_text_ids.append(elem_id)
                else:
                    regular_text_ids.append(elem_id)
            elif 'fallacy-image' in elem_id or 'chart' in elem_id.lower():
                image_ids.append(elem_id)
            elif 'tag' in elem_id.lower() or 'minimap' in elem_id.lower():
                tag_ids.append(elem_id)
            else:
                regular_text_ids.append(elem_id)

        # Create AOIs
        if fallacy_text_ids:
            self.aois.append(AOI(
                name="Fallacy Highlighted Text",
                category="fallacy_text",
                element_ids=fallacy_text_ids
            ))

        if regular_text_ids:
            self.aois.append(AOI(
                name="Regular Text",
                category="regular_text",
                element_ids=regular_text_ids
            ))

        if image_ids:
            self.aois.append(AOI(
                name="Charts/Images",
                category="chart",
                element_ids=image_ids
            ))

        if tag_ids:
            self.aois.append(AOI(
                name="Fallacy Tags",
                category="fallacy_tag",
                element_ids=tag_ids
            ))

        return self.aois

    def define_custom_aois(self, aoi_definitions: List[dict]):
        """
        Define custom AOIs from a list of definitions.

        Each definition should have:
        - name: str
        - category: str
        - element_patterns: List[str] - patterns to match element IDs
        - fallacy_type: Optional[str]
        """
        for defn in aoi_definitions:
            matching_ids = []
            patterns = defn.get('element_patterns', [])

            for point in self.gaze_points:
                elem_id = point.get('elementId', '')
                if any(pattern in elem_id for pattern in patterns):
                    if elem_id not in matching_ids:
                        matching_ids.append(elem_id)

            self.aois.append(AOI(
                name=defn['name'],
                category=defn['category'],
                element_ids=matching_ids,
                fallacy_type=defn.get('fallacy_type')
            ))

        return self.aois

    def detect_fixations(self) -> List[Fixation]:
        """
        Detect fixations from raw gaze points using velocity-based detection.

        A fixation is detected when consecutive gaze points stay within
        FIXATION_RADIUS_PX for at least MIN_FIXATION_DURATION_MS.
        """
        if not self.gaze_points:
            return []

        # Sort by timestamp
        sorted_points = sorted(self.gaze_points, key=lambda p: p.get('timestamp', 0))

        fixations = []
        current_fixation_points = []

        for i, point in enumerate(sorted_points):
            pos = point.get('position', {})
            x, y = pos.get('x'), pos.get('y')

            if x is None or y is None:
                continue

            if not current_fixation_points:
                current_fixation_points.append(point)
                continue

            # Calculate distance from fixation centroid
            centroid_x = statistics.mean(
                p['position']['x'] for p in current_fixation_points
                if p.get('position', {}).get('x') is not None
            )
            centroid_y = statistics.mean(
                p['position']['y'] for p in current_fixation_points
                if p.get('position', {}).get('y') is not None
            )

            distance = ((x - centroid_x) ** 2 + (y - centroid_y) ** 2) ** 0.5

            if distance <= self.FIXATION_RADIUS_PX:
                # Still within fixation
                current_fixation_points.append(point)
            else:
                # Fixation ended - check if it meets minimum duration
                if len(current_fixation_points) >= 2:
                    start_time = current_fixation_points[0].get('timestamp', 0)
                    end_time = current_fixation_points[-1].get('timestamp', 0)
                    duration = end_time - start_time

                    if duration >= self.MIN_FIXATION_DURATION_MS:
                        # Get most common element ID in this fixation
                        elem_ids = [p.get('elementId') for p in current_fixation_points if p.get('elementId')]
                        most_common_id = max(set(elem_ids), key=elem_ids.count) if elem_ids else None

                        # Determine AOI category
                        aoi_cat = self._get_aoi_category(most_common_id)

                        fixations.append(Fixation(
                            start_time=start_time,
                            end_time=end_time,
                            duration=duration,
                            x=centroid_x,
                            y=centroid_y,
                            element_id=most_common_id,
                            aoi_category=aoi_cat
                        ))

                # Start new potential fixation
                current_fixation_points = [point]

        # Handle last fixation
        if len(current_fixation_points) >= 2:
            start_time = current_fixation_points[0].get('timestamp', 0)
            end_time = current_fixation_points[-1].get('timestamp', 0)
            duration = end_time - start_time

            if duration >= self.MIN_FIXATION_DURATION_MS:
                elem_ids = [p.get('elementId') for p in current_fixation_points if p.get('elementId')]
                most_common_id = max(set(elem_ids), key=elem_ids.count) if elem_ids else None
                aoi_cat = self._get_aoi_category(most_common_id)

                centroid_x = statistics.mean(
                    p['position']['x'] for p in current_fixation_points
                    if p.get('position', {}).get('x') is not None
                )
                centroid_y = statistics.mean(
                    p['position']['y'] for p in current_fixation_points
                    if p.get('position', {}).get('y') is not None
                )

                fixations.append(Fixation(
                    start_time=start_time,
                    end_time=end_time,
                    duration=duration,
                    x=centroid_x,
                    y=centroid_y,
                    element_id=most_common_id,
                    aoi_category=aoi_cat
                ))

        self.fixations = fixations
        return fixations

    def _get_aoi_category(self, element_id: Optional[str]) -> Optional[str]:
        """Determine AOI category for an element ID."""
        if not element_id:
            return None

        for aoi in self.aois:
            if element_id in aoi.element_ids:
                return aoi.category

        # Fallback heuristics
        if 'news-sentence' in element_id:
            return 'regular_text'  # Could be fallacy_text, but default to regular
        elif 'fallacy-image' in element_id or 'chart' in element_id.lower():
            return 'chart'
        elif 'tag' in element_id.lower():
            return 'fallacy_tag'

        return None

    def compute_aoi_metrics(self) -> Dict[str, AOIMetrics]:
        """
        Compute metrics for each AOI category.

        Returns dict mapping category name to AOIMetrics.
        """
        # Ensure fixations are detected
        if not self.fixations:
            self.detect_fixations()

        # Initialize metrics for each category
        categories = ['fallacy_text', 'fallacy_tag', 'chart', 'regular_text', 'unknown']
        metrics = {}

        for cat in categories:
            metrics[cat] = AOIMetrics(
                aoi_name=cat.replace('_', ' ').title(),
                category=cat
            )

        # Track AOI visit sequence for revisit calculation
        visit_sequence = []

        for fix in self.fixations:
            cat = fix.aoi_category or 'unknown'

            if cat not in metrics:
                metrics[cat] = AOIMetrics(aoi_name=cat, category=cat)

            m = metrics[cat]
            m.fixation_count += 1
            m.total_dwell_time += fix.duration
            m.fixation_durations.append(fix.duration)

            # Track first fixation time (relative to session start)
            if m.first_fixation_time is None:
                m.first_fixation_time = fix.start_time - self.session_start

            # Track revisits
            if visit_sequence and visit_sequence[-1] != cat:
                # Coming from a different AOI
                if cat in visit_sequence[:-1]:
                    m.revisits += 1

            visit_sequence.append(cat)

        # Calculate mean fixation duration
        for m in metrics.values():
            if m.fixation_durations:
                m.mean_fixation_duration = statistics.mean(m.fixation_durations)

        return metrics

    def compute_comparative_metrics(self) -> dict:
        """
        Compute metrics useful for comparing control vs treatment groups.

        Returns a flat dictionary suitable for CSV export with:
        - Total reading time
        - Time on fallacy vs regular content
        - Proportion of attention on different AOIs
        - Reading patterns (scanpath metrics)
        """
        metrics = self.compute_aoi_metrics()

        total_dwell = sum(m.total_dwell_time for m in metrics.values())
        total_fixations = sum(m.fixation_count for m in metrics.values())

        result = {
            'participant_id': self.data.get('metadata', {}).get('participantId', 'unknown'),
            'session_duration_ms': self.data.get('metadata', {}).get('sessionDuration', 0),
            'total_gaze_points': len(self.gaze_points),
            'total_fixations': total_fixations,
            'total_dwell_time_ms': total_dwell,
        }

        # Per-AOI metrics
        for cat in ['fallacy_text', 'fallacy_tag', 'chart', 'regular_text']:
            m = metrics.get(cat, AOIMetrics(cat, cat))
            prefix = cat

            result[f'{prefix}_fixation_count'] = m.fixation_count
            result[f'{prefix}_dwell_time_ms'] = m.total_dwell_time
            result[f'{prefix}_mean_fixation_ms'] = round(m.mean_fixation_duration, 2)
            result[f'{prefix}_first_fixation_ms'] = m.first_fixation_time
            result[f'{prefix}_revisits'] = m.revisits

            # Proportions
            if total_dwell > 0:
                result[f'{prefix}_dwell_proportion'] = round(m.total_dwell_time / total_dwell, 4)
            else:
                result[f'{prefix}_dwell_proportion'] = 0

            if total_fixations > 0:
                result[f'{prefix}_fixation_proportion'] = round(m.fixation_count / total_fixations, 4)
            else:
                result[f'{prefix}_fixation_proportion'] = 0

        # Comparative ratios
        fallacy_dwell = (metrics.get('fallacy_text', AOIMetrics('', '')).total_dwell_time +
                         metrics.get('fallacy_tag', AOIMetrics('', '')).total_dwell_time)
        regular_dwell = metrics.get('regular_text', AOIMetrics('', '')).total_dwell_time

        if regular_dwell > 0:
            result['fallacy_to_regular_ratio'] = round(fallacy_dwell / regular_dwell, 4)
        else:
            result['fallacy_to_regular_ratio'] = None

        # Interaction data
        interactions = self.data.get('fallacyInteractions', {}).get('interactions', [])
        result['fallacy_interactions_count'] = len(interactions)
        result['unique_fallacies_viewed'] = len(set(i.get('fallacyKey') for i in interactions))

        # Click data
        clicks = self.data.get('clickEvents', {}).get('events', [])
        result['total_clicks'] = len(clicks)
        result['fallacy_clicks'] = sum(1 for c in clicks if c.get('fallacyType'))

        return result

    def generate_fixation_sequence(self) -> List[dict]:
        """
        Generate a sequence of fixations for scanpath analysis.

        Returns list of fixation records with timing and AOI info.
        """
        if not self.fixations:
            self.detect_fixations()

        return [
            {
                'fixation_number': i + 1,
                'start_time_ms': f.start_time - self.session_start,
                'duration_ms': f.duration,
                'x': round(f.x, 2),
                'y': round(f.y, 2),
                'element_id': f.element_id,
                'aoi_category': f.aoi_category
            }
            for i, f in enumerate(self.fixations)
        ]


def analyze_single_file(filepath: str, output_path: Optional[str] = None) -> dict:
    """Analyze a single exported JSON file."""
    with open(filepath, 'r') as f:
        data = json.load(f)

    analyzer = AOIAnalyzer(data)
    analyzer.define_aois_from_data()

    # Get comparative metrics
    comparative = analyzer.compute_comparative_metrics()

    # Get detailed AOI metrics
    aoi_metrics = analyzer.compute_aoi_metrics()

    # Get fixation sequence
    fixation_sequence = analyzer.generate_fixation_sequence()

    results = {
        'comparative_metrics': comparative,
        'aoi_metrics': {k: {
            'fixation_count': v.fixation_count,
            'total_dwell_time_ms': v.total_dwell_time,
            'mean_fixation_duration_ms': round(v.mean_fixation_duration, 2),
            'first_fixation_time_ms': v.first_fixation_time,
            'revisits': v.revisits
        } for k, v in aoi_metrics.items()},
        'fixation_sequence': fixation_sequence,
        'summary': {
            'total_fixations': len(fixation_sequence),
            'analysis_timestamp': data.get('metadata', {}).get('exportTimestamp'),
            'article_title': data.get('metadata', {}).get('articleTitle')
        }
    }

    if output_path:
        with open(output_path, 'w') as f:
            json.dump(results, f, indent=2)
        print(f"Results saved to {output_path}")

    return results


def analyze_multiple_files(filepaths: List[str], output_csv: str):
    """
    Analyze multiple files and output comparative CSV.

    Useful for comparing control vs treatment groups.
    """
    all_metrics = []

    for filepath in filepaths:
        try:
            with open(filepath, 'r') as f:
                data = json.load(f)

            analyzer = AOIAnalyzer(data)
            analyzer.define_aois_from_data()
            metrics = analyzer.compute_comparative_metrics()
            metrics['source_file'] = filepath
            all_metrics.append(metrics)

        except Exception as e:
            print(f"Error processing {filepath}: {e}")

    if not all_metrics:
        print("No files processed successfully")
        return

    # Write to CSV
    fieldnames = list(all_metrics[0].keys())

    with open(output_csv, 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(all_metrics)

    print(f"Comparative metrics saved to {output_csv}")
    print(f"Processed {len(all_metrics)} files")


def main():
    parser = argparse.ArgumentParser(
        description='AOI Analysis for Skeptik Eye Tracking Data'
    )
    parser.add_argument('files', nargs='+', help='JSON file(s) to analyze')
    parser.add_argument('--output', '-o', help='Output file path')
    parser.add_argument('--csv', action='store_true',
                        help='Output as CSV (for multiple files)')
    parser.add_argument('--verbose', '-v', action='store_true',
                        help='Print detailed metrics')

    args = parser.parse_args()

    if len(args.files) == 1 and not args.csv:
        # Single file analysis
        results = analyze_single_file(
            args.files[0],
            args.output or args.files[0].replace('.json', '_aoi_analysis.json')
        )

        if args.verbose:
            print("\n=== AOI Analysis Results ===\n")
            print("Comparative Metrics:")
            for k, v in results['comparative_metrics'].items():
                print(f"  {k}: {v}")

            print("\nAOI Metrics:")
            for aoi, metrics in results['aoi_metrics'].items():
                print(f"\n  {aoi}:")
                for k, v in metrics.items():
                    print(f"    {k}: {v}")
    else:
        # Multiple file analysis
        output_csv = args.output or 'aoi_comparative_analysis.csv'
        analyze_multiple_files(args.files, output_csv)


if __name__ == '__main__':
    main()
