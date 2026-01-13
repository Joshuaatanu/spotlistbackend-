# spotlist_checker.py

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Dict, Any, Optional, Set

import re
import pandas as pd


def parse_number_safe(raw) -> float:
    """
    Port of your parseNumberSafe from Apps Script.

    - Handles integers, floats, and strings with commas / dots / currency symbols.
    - Returns 0.0 on invalid / empty.
    """
    if raw is None or raw == "":
        return 0.0
    if isinstance(raw, (int, float)):
        return float(raw)

    s = str(raw).strip()

    # If both '.' and ',' exist, treat '.' as thousand separator and ',' as decimal
    if "," in s and "." in s:
        s = s.replace(".", "").replace(",", ".")
    else:
        s = s.replace(",", ".")

    # Remove everything except digits, '.', and '-'
    s = re.sub(r"[^0-9.\-]", "", s)

    try:
        return float(s)
    except ValueError:
        return 0.0


def build_datetime_for_comparison(date_val, time_val) -> Optional[datetime]:
    """
    Rough equivalent of buildDateTimeForComparison(dateCell, timeCell).

    For your sample:
      - date is like '2025-11-30'
      - time is like '10:06:00'
    """
    if date_val is None or time_val is None:
        return None

    # Remove surrounding whitespace that often appears in exported CSVs
    if isinstance(date_val, str):
        date_val = date_val.strip()
    if isinstance(time_val, str):
        time_val = time_val.strip()

    # Normalise date
    date_str = str(date_val).strip()
    d = None
    
    # Try DD.MM.YYYY format first (German format)
    if '.' in date_str:
        parts = date_str.split('.')
        if len(parts) == 3:
            try:
                day, month, year = int(parts[0]), int(parts[1]), int(parts[2])
                # Assume 4-digit year, or handle 2-digit year
                if year < 100:
                    year += 2000  # Convert 2-digit to 4-digit (e.g., 25 -> 2025)
                d = datetime(year, month, day).date()
            except (ValueError, IndexError):
                pass
    
    # If DD.MM.YYYY parsing failed, try other formats
    if d is None:
        try:
            # Works fine for 'YYYY-MM-DD'
            d = datetime.fromisoformat(date_str).date()
        except ValueError:
            try:
                # Fallback to pandas parsing style
                d = pd.to_datetime(date_str).date()
            except Exception:
                return None

    # Normalise time
    if isinstance(time_val, datetime):
        t = time_val.time()
        return datetime.combine(d, t)

    # Assume 'HH:MM:SS' or 'HH:MM'
    parts = str(time_val).strip().split(":")
    if len(parts) < 2:
        return None

    try:
        h = int(parts[0] or 0)
        m = int(parts[1] or 0)
        s = int(parts[2]) if len(parts) > 2 and parts[2] else 0
    except ValueError:
        return None

    return datetime(d.year, d.month, d.day, h, m, s)


def is_same_day(a: datetime, b: datetime) -> bool:
    return a.date() == b.date()


@dataclass
class SpotlistCheckerConfig:
    creative_match_mode: int = 2          # 1 = exact creative, 2 = substring
    creative_match_text: str = "buy"
    time_window_minutes: int = 60
    column_map: Dict[str, str] = None

    def __post_init__(self):
        if self.column_map is None:
            # Defaults tailored to your sample CSV
            self.column_map = {
                "program": "Channel",
                "date": "Airing date",
                "time": "Airing time",
                "cost": "Spend",
                "sendung_long": "EPG name",
                "sendung_medium": "Claim",
            }
        # Normalise the search text
        self.creative_match_text = self.creative_match_text.lower().strip()


class SpotlistChecker:
    def __init__(self, config: Optional[SpotlistCheckerConfig] = None):
        self.config = config or SpotlistCheckerConfig()

    # ---------- Public API ----------

    def annotate_spotlist(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Takes a raw spotlist DataFrame and returns a copy
        with extra columns: timestamp, is_double, is_same_sendung, is_diff_sendung.
        """
        cfg = self.config
        df = df.copy()

        # Build timestamp column
        df["timestamp"] = df.apply(
            lambda row: build_datetime_for_comparison(
                row[cfg.column_map["date"]],
                row[cfg.column_map["time"]],
            ),
            axis=1,
        )

        # Normalised columns
        if "sendung_medium" in cfg.column_map:
            df["creative_norm"] = (
                df[cfg.column_map["sendung_medium"]]
                .astype(str)
                .str.lower()
            )
        else:
            df["creative_norm"] = "n/a"

        df["program_norm"] = (
            df[cfg.column_map["program"]]
            .astype(str)
        )

        # Preload lists for speed
        timestamps = df["timestamp"].tolist()
        program_vals = df["program_norm"].tolist()
        creative_vals = df["creative_norm"].tolist() if isinstance(df["creative_norm"].iloc[0] if len(df) > 0 else None, str) else ["n/a"] * len(df)

        if "sendung_long" in cfg.column_map:
            sendungL_vals = df[cfg.column_map["sendung_long"]].astype(str).tolist()
        else:
            sendungL_vals = ["n/a"] * len(df)

        if "sendung_medium" in cfg.column_map:
            sendungM_vals = df[cfg.column_map["sendung_medium"]].astype(str).tolist()
        else:
            sendungM_vals = ["n/a"] * len(df)

        n = len(df)
        double_indices: Set[int] = set()
        same_sendung_indices: Set[int] = set()
        diff_sendung_indices: Set[int] = set()

        # Main double loop (same structure as the Apps Script)
        for i in range(n):
            ts_a = timestamps[i]
            if ts_a is None:
                continue

            for j in range(i + 1, n):
                # Same program?
                if program_vals[i] != program_vals[j]:
                    continue

                ts_b = timestamps[j]
                if ts_b is None:
                    continue

                # Same calendar day?
                if not is_same_day(ts_a, ts_b):
                    continue

                # Time difference in minutes
                diff_minutes = abs((ts_b - ts_a).total_seconds()) / 60.0
                if diff_minutes > cfg.time_window_minutes:
                    continue

                # Creative matching
                if not self._match_creative(creative_vals[i], creative_vals[j]):
                    continue

                # All criteria met: double booking
                double_indices.add(i)
                double_indices.add(j)

                same_sendung = (
                    sendungL_vals[i] == sendungL_vals[j] and
                    sendungM_vals[i] == sendungM_vals[j]
                )
                if same_sendung:
                    same_sendung_indices.add(i)
                    same_sendung_indices.add(j)
                else:
                    diff_sendung_indices.add(i)
                    diff_sendung_indices.add(j)

        # Attach flags
        df["is_double"] = [idx in double_indices for idx in range(n)]
        df["is_same_sendung"] = [idx in same_sendung_indices for idx in range(n)]
        df["is_diff_sendung"] = [idx in diff_sendung_indices for idx in range(n)]

        return df

    def compute_metrics(self, df: pd.DataFrame) -> Dict[str, Any]:
        """
        Mirrors the metrics you compute in the analyse sheet.
        """
        cfg = self.config
        cost_col = cfg.column_map["cost"]

        # Ensure we have numeric cost
        cost_series = df[cost_col].apply(parse_number_safe)
        total_cost = float(cost_series.sum())

        df_double = df[df["is_double"]]
        double_cost = float(df_double[cost_col].apply(parse_number_safe).sum())

        total_spots = int(len(df))
        double_spots = int(len(df_double))
        same_sendung_spots = int(df_double["is_same_sendung"].sum())
        diff_sendung_spots = int(df_double["is_diff_sendung"].sum())

        percent_cost = (double_cost / total_cost) if total_cost > 0 else 0.0
        percent_spots = (double_spots / total_spots) if total_spots > 0 else 0.0

        return {
            "total_cost": total_cost,
            "double_cost": double_cost,
            "percent_cost": percent_cost,
            "total_spots": total_spots,
            "double_spots": double_spots,
            "percent_spots": percent_spots,
            "same_sendung_spots": same_sendung_spots,
            "diff_sendung_spots": diff_sendung_spots,
        }
    def _match_creative(self, a: str, b: str) -> bool:
        """
        Mode 1: exact same creative
        Mode 2: both creatives contain the search text
        """
        mode = self.config.creative_match_mode
        text = self.config.creative_match_text

        a = (a or "").lower()
        b = (b or "").lower()

        if mode == 1:
            # EXAKT GLEICH
            return a == b
        elif mode == 2:
            # ÄHNLICH – wenn beide Creatives den gesuchten Text enthalten
            if not text:
                return False
            return text in a and text in b
        else:
            return False
