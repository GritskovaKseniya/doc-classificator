#!/usr/bin/env python3
"""
File scanner with configurable include/exclude folders.
- Reads config (JSON or YAML) describing a UNC-accessible root path, include/exclude folders, and a tag.
- Walks included folders recursively while skipping excluded ones.
- Produces output.json with file path, filename, tag, and a concise summary (<=600 chars).
"""

from __future__ import annotations

import argparse
import json
import os
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Iterable, List, Set
from file_summary import summarize_file

try:
    import yaml  # type: ignore
except ImportError:  # Optional dependency
    yaml = None


def log(msg: str) -> None:
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] {msg}")


def read_config(config_path: Path) -> Dict[str, Any]:
    if not config_path.exists():
        raise FileNotFoundError(f"Config not found: {config_path}")

    suffix = config_path.suffix.lower()
    raw_text = config_path.read_text(encoding="utf-8", errors="ignore")

    if suffix in {".yaml", ".yml"}:
        if yaml is None:
            raise RuntimeError("pyyaml is required for YAML configs.")
        data = yaml.safe_load(raw_text)
    else:
        # Default to JSON (also works if suffix missing but content is JSON)
        data = json.loads(raw_text)

    if not isinstance(data, dict):
        raise ValueError("Config must define a JSON/YAML object.")
    return data


def normalize_folders(entries: Iterable[str]) -> Set[str]:
    # Store as normalized parts to compare against folder names during walk
    normalized: Set[str] = set()
    for entry in entries:
        entry = entry.strip().strip("\\/")  # remove leading/trailing separators
        if entry:
            normalized.add(entry)
    return normalized


def should_skip_folder(rel_parts: Iterable[str], excluded: Set[str]) -> bool:
    # Skip if any component of the relative path matches an excluded folder name
    return any(part in excluded for part in rel_parts)

def gather_files(
    root: Path,
    includes: Iterable[str],
    excludes: Set[str],
) -> List[Dict[str, Path]]:
    results: List[Dict[str, Path]] = []
    for include in includes:
        include_rel = Path(include.strip("\\/"))
        include_root = root.joinpath(include_rel)

        if not include_root.exists():
            log(f"Include path missing, skipped: {include_root}")
            continue

        for current, dirs, files in os.walk(include_root):
            current_path = Path(current)
            rel_parts = current_path.relative_to(root).parts
            # Prune excluded directories in-place
            dirs[:] = [d for d in dirs if not should_skip_folder(rel_parts + (d,), excludes)]
            if should_skip_folder(rel_parts, excludes):
                continue

            for filename in files:
                file_path = current_path / filename
                results.append({"path": file_path, "filename": filename})
    return results


def build_output(
    config: Dict[str, Any],
    files: List[Dict[str, Path]],
    root: Path,
) -> Dict[str, Any]:
    cliente = root.name or root.parts[-1] if root.parts else "unknown"
    tag = str(config.get("tag", "")).strip()

    output_files = []
    for entry in files:
        path = entry["path"]
        summary = summarize_file(path)
        output_files.append(
            {
                "path": str(path),
                "filename": entry["filename"],
                "tag": tag,
                "summary": summary,
            }
        )

    return {"cliente": cliente, "files": output_files}


def save_output(data: Dict[str, Any], output_path: Path) -> None:
    output_path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    log(f"Output saved to: {output_path}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Scan documents and summarize them.")
    parser.add_argument(
        "-c",
        "--config",
        type=Path,
        default=Path("docs_config.json"),
        help="Path to config file (JSON or YAML).",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    script_dir = Path(__file__).resolve().parent
    config_path = (args.config if args.config.is_absolute() else script_dir / args.config).resolve()

    try:
        config = read_config(config_path)
    except Exception as exc:  # noqa: BLE001
        log(f"Failed to read config: {exc}")
        return

    root = Path(str(config.get("input_root_path", ""))).expanduser()
    if not root.exists():
        log(f"Root path not found or inaccessible: {root}")
        return

    include_folders = normalize_folders(config.get("include_folders", []))
    exclude_folders = normalize_folders(config.get("exclude_folders", []))

    log(f"Scanning root: {root}")
    log(f"Including: {', '.join(include_folders) if include_folders else '(none)'}")
    log(f"Excluding: {', '.join(exclude_folders) if exclude_folders else '(none)'}")

    try:
        files = gather_files(root, include_folders or [""], exclude_folders)
    except Exception as exc:  # noqa: BLE001
        log(f"Error during scan: {exc}")
        return

    output_data = build_output(config, files, root)
    output_path = script_dir / "output.json"

    try:
        save_output(output_data, output_path)
    except Exception as exc:  # noqa: BLE001
        log(f"Failed to save output: {exc}")
        return

    print(output_path)


if __name__ == "__main__":
    main()
