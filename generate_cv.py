from __future__ import annotations

import argparse
from pathlib import Path

from ats_harvard_cv.builder import DEFAULT_TEMPLATE, ats_warnings, generate_cv, load_cv_data


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate an ATS-friendly Harvard-style CV/resume DOCX.")
    parser.add_argument("--data", required=True, help="Path to a JSON resume data file. YAML also works with PyYAML.")
    parser.add_argument("--output", default="outputs/cv.docx", help="Output DOCX path.")
    parser.add_argument("--template", default=str(DEFAULT_TEMPLATE), help="DOCX template path.")
    parser.add_argument("--strict", action="store_true", help="Fail when ATS warnings are found.")
    args = parser.parse_args()

    data = load_cv_data(args.data)
    warnings = ats_warnings(data)
    if warnings:
        print("ATS warnings:")
        for warning in warnings:
            print(f"- {warning}")
        if args.strict:
            raise SystemExit(2)

    output = generate_cv(data, Path(args.output), Path(args.template))
    print(f"Generated: {output}")


if __name__ == "__main__":
    main()
