# dashboard_app.py

import io

import pandas as pd
import streamlit as st
import plotly.express as px

from spotlist_checkerv2 import (
    SpotlistChecker,
    SpotlistCheckerConfig,
    parse_number_safe,   # 👈 add this
)


st.set_page_config(
    page_title="Spotlist Double-Booking Checker",
    layout="wide",
)


def main():
    st.title("📺 Spotlist Double-Booking Checker")

    st.markdown(
        """
This dashboard detects **potential double bookings** in TV spotlists
based on your original Google Apps Script logic:

- Same **Channel**
- Same **calendar day**
- Within a configurable **time window** (minutes)
- Matching **creatives** (exact or substring match)
        """
    )

    # --- Sidebar controls -----------------------------------------------------
    with st.sidebar:
        st.header("Settings")

        creative_mode = st.radio(
            "Creative match mode",
            options=[1, 2],
            index=1,
            format_func=lambda x: "1 – Exact creative" if x == 1 else "2 – Both contain text",
        )

        creative_text = st.text_input(
            "Creative match text (for mode 2)",
            value="buy",
            help="Both creatives must contain this text in mode 2.",
        )

        selling_keywords_input = st.text_input(
            "Selling creatives keywords (comma-separated)",
            value="verkaufen,sell",
            help="Used to identify selling creatives in the Claim text.",
        )

        buying_keywords_input = st.text_input(
            "Buying creatives keywords (comma-separated)",
            value="kaufen,buy,shop",
            help="Used to identify buying creatives in the Claim text.",
        )

        time_window = st.slider(
            "Time window (minutes)",
            min_value=5,
            max_value=120,
            value=60,
            step=5,
        )

        st.markdown("---")
        st.caption(
            "Columns expected (by default): "
            "`Channel`, `Airing date`, `Airing time`, `Spend`, `EPG name`, `Claim`"
        )

    # --- File upload ----------------------------------------------------------
    uploaded = st.file_uploader(
        "Upload spotlist file (CSV or Excel)", type=["csv", "xlsx"]
    )

    if uploaded is None:
        st.info("Upload a CSV or Excel spotlist to start the analysis.")
        return

    # Load data
    if uploaded.name.lower().endswith(".csv"):
        df_raw = pd.read_csv(uploaded)
    else:
        df_raw = pd.read_excel(uploaded)

    # Parse selling / buying keyword lists from sidebar
    selling_keywords = [
        k.strip().lower()
        for k in selling_keywords_input.split(",")
        if k.strip()
    ]
    buying_keywords = [
        k.strip().lower()
        for k in buying_keywords_input.split(",")
        if k.strip()
    ]

    st.subheader("Raw data preview")
    st.dataframe(df_raw.head(20), use_container_width=True)

    # --- Run checker ----------------------------------------------------------
    cfg = SpotlistCheckerConfig(
        creative_match_mode=creative_mode,
        creative_match_text=creative_text,
        time_window_minutes=time_window,
        # column_map can be overridden here if needed
    )
    checker = SpotlistChecker(cfg)

    with st.spinner("Running double-booking analysis..."):
        df_annotated = checker.annotate_spotlist(df_raw)
        metrics = checker.compute_metrics(df_annotated)

    # --- KPIs / Metrics -------------------------------------------------------
    st.subheader("Summary metrics")

    col1, col2, col3, col4 = st.columns(4)

    col1.metric(
        "Total spend",
        f"{metrics['total_cost']:,.2f}",
    )
    col2.metric(
        "Spend in double bookings",
        f"{metrics['double_cost']:,.2f}",
        f"{metrics['percent_cost']*100:.1f}% of total",
    )
    col3.metric(
        "Total spots",
        f"{metrics['total_spots']:,}",
    )
    col4.metric(
        "Double-booked spots",
        f"{metrics['double_spots']:,}",
        f"{metrics['percent_spots']*100:.1f}% of spots",
    )


    col5, col6 = st.columns(2)
    col5.metric(
        "Double spots (same EPG + creative)",
        f"{metrics['same_sendung_spots']:,}",
    )
    col6.metric(
        "Double spots (different EPG / creative)",
        f"{metrics['diff_sendung_spots']:,}",
    )

    # --- Doppelbuchungen nach Zeitfenster ------------------------------------
    st.subheader("Doppelbuchungen nach Zeitfenster")

    time_windows_multi = [30, 60, 90, 120]
    window_rows = []

    for w in time_windows_multi:
        cfg_w = SpotlistCheckerConfig(
            creative_match_mode=creative_mode,
            creative_match_text=creative_text,
            time_window_minutes=w,
        )
        checker_w = SpotlistChecker(cfg_w)
        df_w = checker_w.annotate_spotlist(df_raw)
        m_w = checker_w.compute_metrics(df_w)

        window_rows.append(
            {
                "Zeitfenster": f"Innerhalb {w} min",
                "Anzahl Spots abs.": m_w["double_spots"],
                "Anzahl Spots pct.": f"{m_w['percent_spots']*100:.2f}%",
                "Budget abs.": m_w["double_cost"],
                "Budget pct.": f"{m_w['percent_cost']*100:.2f}%",
            }
        )

    df_window_summary = pd.DataFrame(window_rows)
    st.dataframe(df_window_summary, use_container_width=True)

    # --- Double bookings table ------------------------------------------------
    st.subheader("Spots marked as double bookings")

    df_double = df_annotated[df_annotated["is_double"]].copy()
    if df_double.empty:
        st.success("No double bookings found with the current settings.")
    else:
        # nicer ordering of columns
        flag_cols = ["is_double", "is_same_sendung", "is_diff_sendung", "timestamp"]
        front_cols = [c for c in flag_cols if c in df_double.columns]
        other_cols = [c for c in df_double.columns if c not in front_cols]
        df_display = df_double[front_cols + other_cols]

        st.dataframe(df_display, use_container_width=True)

    # --- Charts ---------------------------------------------------------------
    st.subheader("Visualisation")

    if not df_double.empty:
        cfg_cols = cfg.column_map

        # Chart 1: Spend in double bookings by channel
        channel_col = cfg_cols["program"]
        cost_col = cfg_cols["cost"]

        df_double_cost_by_channel = (
            df_double.groupby(channel_col)[cost_col]
            .apply(lambda s: s.apply(parse_number_safe).sum())
            .reset_index(name="double_spend")
        )

        fig1 = px.bar(
            df_double_cost_by_channel,
            x=channel_col,
            y="double_spend",
            title="Spend in double-booked spots by channel",
        )
        st.plotly_chart(fig1, use_container_width=True)

        # Chart 2: Double bookings over time
        if "timestamp" in df_double.columns:
            df_double_by_date = (
                df_double.assign(date=df_double["timestamp"].dt.date)
                .groupby("date")
                .agg(double_spots=("is_double", "sum"))
                .reset_index()
            )
            fig2 = px.line(
                df_double_by_date,
                x="date",
                y="double_spots",
                markers=True,
                title="Number of double-booked spots per day",
            )
            st.plotly_chart(fig2, use_container_width=True)

    # --- Doppelbuchungen nach Zeitfenster ------------------------------------
    st.subheader("Doppelbuchungen nach Zeitfenster")

    time_windows_multi = [30, 60, 90, 120]
    window_rows = []

    for w in time_windows_multi:
        cfg_w = SpotlistCheckerConfig(
            creative_match_mode=creative_mode,
            creative_match_text=creative_text,
            time_window_minutes=w,
        )
        checker_w = SpotlistChecker(cfg_w)
        df_w = checker_w.annotate_spotlist(df_raw)
        m_w = checker_w.compute_metrics(df_w)

        window_rows.append(
            {
                "Zeitfenster": f"Innerhalb {w} min",
                "Anzahl Spots abs.": m_w["double_spots"],
                "Anzahl Spots pct.": f"{m_w['percent_spots']*100:.2f}%",
                "Budget abs.": m_w["double_cost"],
                "Budget pct.": f"{m_w['percent_cost']*100:.2f}%",
            }
        )

    df_window_summary = pd.DataFrame(window_rows)
    st.dataframe(df_window_summary, use_container_width=True)

    # --- Selling Creatives: Doppelbuchungen nach Zeitfenster -----------------
    st.subheader("Selling Creatives – Doppelbuchungen nach Zeitfenster")

    selling_rows = []
    for w in time_windows_multi:
        cfg_w = SpotlistCheckerConfig(
            creative_match_mode=creative_mode,
            creative_match_text=creative_text,
            time_window_minutes=w,
        )
        checker_w = SpotlistChecker(cfg_w)
        df_w = checker_w.annotate_spotlist(df_raw)

        # classify selling creatives based on Claim text and keywords
        creative_col_w = cfg_w.column_map["sendung_medium"]
        df_w["creative_text_norm"] = df_w[creative_col_w].astype(str).str.lower()

        if selling_keywords:
            selling_mask = df_w["creative_text_norm"].apply(
                lambda c: any(kw in c for kw in selling_keywords)
            )
        else:
            selling_mask = pd.Series(False, index=df_w.index)

        cost_col_w = cfg_w.column_map["cost"]
        total_cost_all = df_w[cost_col_w].apply(parse_number_safe).sum()
        total_spots_all = len(df_w)

        df_selling_double = df_w[selling_mask & df_w["is_double"]]

        double_spots = len(df_selling_double)
        double_cost = df_selling_double[cost_col_w].apply(parse_number_safe).sum()

        percent_spots = (double_spots / total_spots_all) if total_spots_all > 0 else 0.0
        percent_cost = (double_cost / total_cost_all) if total_cost_all > 0 else 0.0

        selling_rows.append(
            {
                "Zeitfenster": f"Innerhalb {w} min",
                "Anzahl Spots abs.": double_spots,
                "Anzahl Spots pct.": f"{percent_spots*100:.2f}%",
                "Budget abs.": double_cost,
                "Budget pct.": f"{percent_cost*100:.2f}%",
            }
        )

    df_selling_summary = pd.DataFrame(selling_rows)
    st.dataframe(df_selling_summary, use_container_width=True)

    # --- Buying Creatives: Doppelbuchungen nach Zeitfenster ------------------
    st.subheader("Buying Creatives – Doppelbuchungen nach Zeitfenster")

    buying_rows = []
    for w in time_windows_multi:
        cfg_w = SpotlistCheckerConfig(
            creative_match_mode=creative_mode,
            creative_match_text=creative_text,
            time_window_minutes=w,
        )
        checker_w = SpotlistChecker(cfg_w)
        df_w = checker_w.annotate_spotlist(df_raw)

        # classify buying creatives based on Claim text and keywords
        creative_col_w = cfg_w.column_map["sendung_medium"]
        df_w["creative_text_norm"] = df_w[creative_col_w].astype(str).str.lower()

        if buying_keywords:
            buying_mask = df_w["creative_text_norm"].apply(
                lambda c: any(kw in c for kw in buying_keywords)
            )
        else:
            buying_mask = pd.Series(False, index=df_w.index)

        cost_col_w = cfg_w.column_map["cost"]
        total_cost_all = df_w[cost_col_w].apply(parse_number_safe).sum()
        total_spots_all = len(df_w)

        df_buying_double = df_w[buying_mask & df_w["is_double"]]

        double_spots = len(df_buying_double)
        double_cost = df_buying_double[cost_col_w].apply(parse_number_safe).sum()

        percent_spots = (double_spots / total_spots_all) if total_spots_all > 0 else 0.0
        percent_cost = (double_cost / total_cost_all) if total_cost_all > 0 else 0.0

        buying_rows.append(
            {
                "Zeitfenster": f"Innerhalb {w} min",
                "Anzahl Spots abs.": double_spots,
                "Anzahl Spots pct.": f"{percent_spots*100:.2f}%",
                "Budget abs.": double_cost,
                "Budget pct.": f"{percent_cost*100:.2f}%",
            }
        )

    df_buying_summary = pd.DataFrame(buying_rows)
    st.dataframe(df_buying_summary, use_container_width=True)

    # --- Download annotated CSV ----------------------------------------------
    st.subheader("Download annotated spotlist")

    csv_buf = io.StringIO()
    df_annotated.to_csv(csv_buf, index=False)
    st.download_button(
        label="Download annotated CSV",
        data=csv_buf.getvalue(),
        file_name="spotlist_annotated.csv",
        mime="text/csv",
    )


if __name__ == "__main__":
    main()