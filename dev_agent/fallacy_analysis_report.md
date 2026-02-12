# Fallacy Analysis Report

Generated: 2026-02-11

## Metrics Explanation

- **Types**: Number of distinct fallacy categories found (max 6: ATM, BBS, SAM, WW, DAC, DIS)
- **Instances**: Total number of sentences flagged with fallacies
- **Entropy**: Shannon entropy measuring diversity of fallacy distribution (higher = more evenly distributed)
- **Normalized Entropy**: Entropy divided by max possible entropy (0-1 scale, 1 = perfectly even distribution)

## Summary Table

| Case | Name | Types | Instances | Entropy | Norm. Entropy |
|------|------|-------|-----------|---------|---------------|
| 0 | Measles "Outbreak" In Maine Was Vaccine-Induced All Along | 4 | 11 | 1.981 | 0.766 |
| 1 | BREAKING: Victory for American Children... | 3 | 8 | 1.406 | 0.544 |
| 2 | 25 Reasons to Avoid the Gardasil Vaccine | 6 | 46 | 2.385 | 0.922 |
| 3 | Measles Vaccine Narrative is Collapsing | 6 | 34 | 2.094 | 0.810 |
| 4 | Deaths From Childhood Diseases Were Declining Before Vaccines | 4 | 7 | 1.522 | 0.589 |
| 5 | RFK Jr. Proves HHS is in Violation of Vaccine Safety Requirements | 3 | 14 | 1.379 | 0.533 |
| 6 | The Facts About Measles | 6 | 21 | 2.405 | 0.930 |
| 7 | 6 Research-Based Reasons to Skip the HPV Vaccine | 4 | 30 | 1.769 | 0.684 |

## Detailed Breakdown

### Case 0: Measles "Outbreak" In Maine Was Vaccine-Induced All Along
- **Text Fallacies**: 4 types, 11 instances
- **Chart Fallacies**: None
- **Types Found**: ATM, BBS, SAM, WW

### Case 1: BREAKING: Victory for American Children...
- **Text Fallacies**: 3 types, 8 instances
- **Chart Fallacies**: None
- **Types Found**: BBS, SAM, WW

### Case 2: 25 Reasons to Avoid the Gardasil Vaccine
- **Text Fallacies**: 6 types, 46 instances
- **Chart Fallacies**: None
- **Types Found**: ATM, BBS, SAM, WW, DAC, DIS
- **Note**: Highest instance count; uses all 6 fallacy categories

### Case 3: Measles Vaccine Narrative is Collapsing
- **Text Fallacies**: 5 types, 23 instances
- **Chart Fallacies**: 1 type (DIS), 11 instances
- **Types Found**: ATM, BBS, SAM, WW, DAC + DIS(chart)
- **Note**: Has 2 chart images with fallacy analysis

### Case 4: Deaths From Childhood Diseases Were Declining Before Vaccines
- **Text Fallacies**: 3 types, 5 instances
- **Chart Fallacies**: 1 type (DIS), 2 instances
- **Types Found**: SAM, WW, BBS + DIS(chart)
- **Note**: Has 9 chart images with fallacy analysis

### Case 5: RFK Jr. Proves HHS is in Violation of Vaccine Safety Requirements
- **Text Fallacies**: 3 types, 14 instances
- **Chart Fallacies**: None
- **Types Found**: BBS, SAM, WW

### Case 6: The Facts About Measles
- **Text Fallacies**: 6 types, 18 instances
- **Chart Fallacies**: 1 type (DIS), 3 instances
- **Types Found**: ATM, BBS, SAM, WW, DAC, DIS + DIS(chart)
- **Note**: Highest normalized entropy (0.930) - most diverse distribution

### Case 7: 6 Research-Based Reasons to Skip the HPV Vaccine
- **Text Fallacies**: 4 types, 30 instances
- **Chart Fallacies**: None
- **Types Found**: ATM, BBS, SAM, WW

## Aggregate Statistics

| Metric | Value |
|--------|-------|
| Total cases analyzed | 8 |
| Avg fallacy types/case | 4.50 |
| Avg instances/case | 21.38 |
| Avg entropy | 1.867 |
| Avg normalized entropy | 0.722 |
| Max possible entropy | 2.585 (for 6 types) |

## Fallacy Type Distribution Across All Cases

| Fallacy Code | Full Name | Cases Present | Total Instances |
|--------------|-----------|---------------|-----------------|
| ATM | Attacking the Messenger? | 5 | ~20 |
| BBS | Baffling with BS? | 8 | ~50 |
| SAM | Smoke & Mirrors? | 8 | ~25 |
| WW | Wait, What? | 8 | ~35 |
| DAC | Divide & Conquer? | 4 | ~10 |
| DIS | Distortion? | 4 | ~30 |

**Most common**: BBS, SAM, WW (present in all 8 cases)
**Least common**: DAC (present in 4 cases)
