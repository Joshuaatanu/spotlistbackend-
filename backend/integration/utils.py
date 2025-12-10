def flatten_spotlist_report(report: dict) -> list[dict]:
    """
    Convert AEOS report response (header + body) into a list of dict rows.
    Each row maps header captions/names to values.
    """
    if report is None:
        return []
    
    header = report.get("header", [])
    body = report.get("body", [])
    
    # Handle None body explicitly
    if body is None:
        return []

    # No data at all
    if not body:
        return []

    # Medium Spotlist / TopTen style: body is already a list of dict rows, e.g.
    # { "XRP": 985.34, "Brand": "RTL", "Airings": 1075, "Company": "RTL Interactive", "Product": "RTL Plus" }
    # In that case we just return the body as-is.
    if isinstance(body, list) and body and isinstance(body[0], dict):
        return body
    
    # Handle case where body is a dict (e.g., channel KPIs where keys are channel IDs/names)
    # Convert dict to list of dicts
    if isinstance(body, dict):
        rows = []
        for key, value in body.items():
            if isinstance(value, dict):
                # Value is already a dict, add the key as a field
                row = value.copy()
                # Try to identify what the key represents (channel ID, channel name, etc.)
                if "Channel" not in row and "channel" not in row:
                    row["Channel"] = key
                rows.append(row)
            elif isinstance(value, (list, tuple)) and value:
                # Value is a list/tuple, might be KPI values
                # Try to map to KPI field names if we can infer them
                row = {"Channel": key}
                # If we have common KPI field names, try to map them
                kpi_names = ["amr-perc", "reach (%)", "reach-avg", "share", "ats-avg", "atv-avg"]
                for i, val in enumerate(value):
                    if i < len(kpi_names):
                        row[kpi_names[i]] = val
                    else:
                        row[f"kpi_{i}"] = val
                rows.append(row)
            else:
                # Simple value, create a basic row
                rows.append({"Channel": key, "Value": value})
        return rows

    # At this point we expect Deep Analysis style structure:
    # - header: list of column descriptors (dicts with key/item/etc. or simple strings)
    # - body:   list of lists (rows), values aligned with header order.
    #
    # Normalise header:
    #   dict -> key/item/caption/name/item, fallback -> col_{i}
    #   str  -> itself
    #   anything else -> col_{i}
    columns: list[str] = []

    # Sometimes getReportData can return header as a dict with metadata (kpi, title, entities, ...)
    # for other report types; in that case there is no column schema to map, so we bail out gracefully.
    if isinstance(header, dict):
        # Without a positional header list, we cannot safely align list-based rows,
        # so return empty to avoid producing wrong mappings.
        return []

    # Ensure header is iterable
    if not isinstance(header, (list, tuple)):
        if header is None:
            header = []
        else:
            # If header is not a list/tuple, we can't process it
            return []

    for i, col in enumerate(header):
        if isinstance(col, dict):
            columns.append(
                col.get("key")
                or col.get("item")
                or col.get("caption")
                or col.get("name")
                or f"col_{i}"
            )
        elif isinstance(col, str):
            columns.append(col)
        else:
            columns.append(f"col_{i}")

    rows = []
    # Ensure body is iterable before iterating
    if body is None:
        return []
    if not isinstance(body, (list, tuple)):
        return []
    
    for row in body:
        if isinstance(row, dict):
            rows.append(row)
        else:
            rows.append(dict(zip(columns, row)))
    return rows
