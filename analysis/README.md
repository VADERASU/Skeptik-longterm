# Skeptik Eye Tracking Analysis

Tools for analyzing eye tracking data exported from Skeptik.

## AOI Analysis

The `aoi_analysis.py` script processes exported gaze data and calculates fixation metrics within predefined Areas of Interest (AOIs).

### AOI Categories

1. **Fallacy Highlighted Text** (`fallacy_text`) - Text marked with fallacy annotations
2. **Fallacy Tags** (`fallacy_tag`) - Sidebar tags showing fallacy types
3. **Charts/Images** (`chart`) - Visual content with annotations
4. **Regular Text** (`regular_text`) - Non-annotated article text

### Usage

#### Single File Analysis

```bash
python aoi_analysis.py participant_001_data.json
```

This creates `participant_001_data_aoi_analysis.json` with:
- Comparative metrics (ready for statistical analysis)
- Per-AOI metrics
- Full fixation sequence

#### Multiple Files (Control vs Treatment)

```bash
python aoi_analysis.py control_*.json treatment_*.json --csv -o comparison.csv
```

Creates a CSV with one row per participant, suitable for importing into R or SPSS.

#### Verbose Output

```bash
python aoi_analysis.py participant_001_data.json -v
```

### Key Metrics for Control vs Treatment Comparison

| Metric | Description | Hypothesis |
|--------|-------------|------------|
| `fallacy_text_dwell_proportion` | % time on annotated text | Higher in treatment group |
| `fallacy_tag_fixation_count` | Number of looks at tags | Higher in treatment group |
| `fallacy_to_regular_ratio` | Time on fallacy vs regular content | Higher in treatment group |
| `fallacy_text_first_fixation_ms` | Time to first look at fallacy | Earlier in treatment group |
| `fallacy_text_revisits` | Returns to fallacy content | Higher in treatment group |

### Example Analysis Workflow

```python
from aoi_analysis import AOIAnalyzer
import json

# Load exported data
with open('participant_data.json') as f:
    data = json.load(f)

# Create analyzer
analyzer = AOIAnalyzer(data)
analyzer.define_aois_from_data()

# Detect fixations
fixations = analyzer.detect_fixations()
print(f"Detected {len(fixations)} fixations")

# Get metrics
metrics = analyzer.compute_comparative_metrics()

# Key comparisons
print(f"Time on fallacy content: {metrics['fallacy_text_dwell_proportion']:.1%}")
print(f"Time on regular text: {metrics['regular_text_dwell_proportion']:.1%}")
print(f"Fallacy/Regular ratio: {metrics['fallacy_to_regular_ratio']:.2f}")
```

### Statistical Analysis

The output CSV can be used directly with statistical software:

```r
# R example
library(tidyverse)

data <- read_csv("comparison.csv")

# Add group column based on filename or participant ID pattern
data <- data %>%
  mutate(group = ifelse(str_detect(source_file, "control"), "control", "treatment"))

# Compare dwell time on fallacy content
t.test(fallacy_text_dwell_proportion ~ group, data = data)

# Compare fixation patterns
wilcox.test(fallacy_tag_fixation_count ~ group, data = data)
```

## Data Format

### Input (Exported from Skeptik)

```json
{
  "metadata": {
    "participantId": "P001",
    "sessionStartTime": 1708123456789,
    "articleTitle": "Example Article"
  },
  "gazeData": {
    "points": [
      {
        "timestamp": 1708123456800,
        "elementId": "0-news-sentence-0",
        "position": {"x": 450, "y": 320}
      }
    ]
  },
  "clickEvents": {...},
  "readingMetrics": {...}
}
```

### Output

```json
{
  "comparative_metrics": {
    "participant_id": "P001",
    "total_fixations": 245,
    "fallacy_text_dwell_proportion": 0.35,
    "fallacy_to_regular_ratio": 1.2
  },
  "aoi_metrics": {
    "fallacy_text": {
      "fixation_count": 89,
      "total_dwell_time_ms": 42000,
      "mean_fixation_duration_ms": 472
    }
  },
  "fixation_sequence": [...]
}
```

## Configuration

Edit `aoi_config.json` to customize:
- AOI definitions and element patterns
- Fixation detection parameters
- Metrics descriptions
