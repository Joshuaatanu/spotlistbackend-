import asyncio
import logging
from typing import List, Dict, Any
from datetime import datetime
from collections import defaultdict
import pandas as pd
from integration.aeos_client import AEOSClient

# Configure logging
logger = logging.getLogger(__name__)

class CompetitorAnalyzer:
    def __init__(self, aeos_client: AEOSClient):
        self.client = aeos_client

    async def _fetch_company_data(
        self, 
        company_id: str, 
        start_date: str, 
        end_date: str, 
        channels: List[str] = None
    ) -> Dict[str, Any]:
        """
        Fetches spot list data for a single company asynchronously (simulated via thread/process if client is sync).
        Since AEOSClient is synchronous, we wrap calls if needed or assume fast enough execution.
        For true parallelism with sync client, we might use run_in_executor.
        """
        try:
            # Initiate report
            # Using initiate_spotlist_medium_report
            # Assuming company_id needs to be in a list for 'companies' param
            logger.info(f"Initiating report for company {company_id}")
            
            # Using thread executor for blocking I/O calls to AEOS
            loop = asyncio.get_event_loop()
            
            # If no channels specified, fetch all analytics channels (AEOS requires channels)
            if not channels:
                logger.info("No channels specified, fetching all analytics channels...")
                all_channels = await loop.run_in_executor(
                    None,
                    lambda: self.client.get_analytics_channels()
                )
                # Extract channel IDs
                channels = [ch.get('id') or ch.get('value') for ch in all_channels if ch.get('id') or ch.get('value')]
                logger.info(f"Using {len(channels)} channels")
            
            # 1. Initiate Report
            report_id = await loop.run_in_executor(
                None,
                lambda: self.client.initiate_spotlist_medium_report(
                    channel_ids=channels,
                    date_from=start_date,
                    date_to=end_date,
                    companies=[int(company_id)] if company_id else None
                )
            )
            
            # 2. Wait for Report
            await loop.run_in_executor(
                None,
                lambda: self.client.wait_for_report(report_id)
            )
            
            # 3. Get Data
            data = await loop.run_in_executor(
                None,
                lambda: self.client.get_report_data(report_id)
            )
            
            # Flatten/Normalize data
            # Assuming utils has a flatten helper, or we parse manually. 
            # AEOSClient.get_channel_kpis uses 'flatten_spotlist_report', let's see if we can use it or similar logic.
            # Ideally we import flatten_spotlist_report from utils
            from integration.utils import flatten_spotlist_report
            
            # AEOSClient.get_report_data returns raw dict with body/header. 
            # The structure for spotlist medium might need specific handling if different from deep analysis.
            # But usually flatten_spotlist_report handles standard Spotlist structure.
            
            # For robustness, let's do a quick structural check or just pass to flatten
            rows = flatten_spotlist_report(data)
            return {"company_id": company_id, "rows": rows, "status": "success"}

        except Exception as e:
            logger.error(f"Error fetching data for company {company_id}: {str(e)}")
            return {"company_id": company_id, "error": str(e), "status": "error"}

    async def analyze_competitors(
        self,
        my_company_id: str,
        competitor_ids: List[str],
        start_date: str,
        end_date: str,
        channels: List[str] = None
    ) -> Dict[str, Any]:
        
        all_company_ids = [my_company_id] + (competitor_ids or [])
        unique_ids = list(set(all_company_ids))
        
        # 1. Fetch data in parallel
        tasks = [
            self._fetch_company_data(cid, start_date, end_date, channels)
            for cid in unique_ids
        ]
        
        results = await asyncio.gather(*tasks)
        
        # 2. Process Results
        processed_data = {}
        market_total_spend = 0.0
        market_total_airings = 0
        
        company_stats = []

        for res in results:
            cid = res["company_id"]
            if res["status"] == "error":
                # Handle error gracefully - maybe return empty stats for this competitor
                logger.warning(f"Skipping failed company {cid}")
                continue
                
            rows = res["rows"]
            df = pd.DataFrame(rows)
            
            # Basic safe guards if empty
            if df.empty:
                stats = {
                    "id": cid,
                    "total_spend": 0,
                    "total_airings": 0,
                    "total_xrp": 0,
                    "channel_breakdown": [],
                    "daypart_breakdown": [],
                    "weekly_trend": [],
                    "top_channels": []
                }
            else:
                # Ensure numeric columns
                # Adjust column names based on actual API return. 
                # Common AEOS columns: 'gross_spend', 'net_spend', 'xrp', 'duration', 'channel'
                # Let's try to standardize.
                
                # Check for spend column
                spend_col = next((c for c in df.columns if 'spend' in c.lower()), 'spend')
                xrp_col = next((c for c in df.columns if 'xrp' in c.lower() or 'grp' in c.lower()), 'xrp')
                
                # Clean up numeric cols
                for col in [spend_col, xrp_col]:
                    if col in df.columns:
                        df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)

                total_spend = df[spend_col].sum() if spend_col in df.columns else 0
                total_xrp = df[xrp_col].sum() if xrp_col in df.columns else 0
                total_airings = len(df)
                
                market_total_spend += total_spend
                market_total_airings += total_airings
                
                # Aggregations
                
                # Channel Breakdown
                if 'channel' in df.columns and spend_col in df.columns:
                    channel_grp = df.groupby('channel')[spend_col].sum().sort_values(ascending=False)
                    channel_breakdown = [
                        {"name": k, "value": v} 
                        for k, v in channel_grp.head(10).items()
                    ]
                else:
                    channel_breakdown = []
                    
                # Daypart Breakdown (using 'daypart' or deriving from time)
                # If 'daypart' column exists
                daypart_breakdown = []
                if 'daypart' in df.columns:
                    dp_grp = df.groupby('daypart')[spend_col].sum()
                    daypart_breakdown = [{"name": k, "value": v} for k,v in dp_grp.items()]
                
                # Weekly Trend
                weekly_trend = []
                if 'date' in df.columns:
                    df['date'] = pd.to_datetime(df['date'])
                    # resample by week
                    # Need to set date as index for resample
                    trend = df.set_index('date').resample('W')[spend_col].sum()
                    weekly_trend = [{"date": k.strftime('%Y-%m-%d'), "value": v} for k,v in trend.items()]

                stats = {
                    "id": cid,
                    "total_spend": float(total_spend),
                    "total_airings": int(total_airings),
                    "total_xrp": float(total_xrp),
                    "channel_breakdown": channel_breakdown,
                    "daypart_breakdown": daypart_breakdown,
                    "weekly_trend": weekly_trend
                }
            
            company_stats.append(stats)
            processed_data[cid] = stats

        # 3. Calculate Comparative Metrics (SOV, Rank)
        # Sort by spend for rank
        company_stats.sort(key=lambda x: x["total_spend"], reverse=True)
        
        final_competitors = []
        my_company_stats = None
        
        for idx, stats in enumerate(company_stats):
            stats["rank"] = idx + 1
            stats["sov_percent"] = (stats["total_spend"] / market_total_spend * 100) if market_total_spend > 0 else 0
            
            # Enrich name if possible? 
            # The API might not return name directly in spotlist, usually it's just ID in request.
            # The client might fetch name separately or frontend handles it. 
            # We will use ID for now, frontend maps it.
            
            if str(stats["id"]) == str(my_company_id):
                my_company_stats = stats
            else:
                final_competitors.append(stats)

        # 4. Construct Final Response
        return {
            "my_company": my_company_stats or {}, # Should verify non-null
            "competitors": final_competitors,
            "market_totals": {
                "total_spend": float(market_total_spend),
                "total_airings": int(market_total_airings),
                "average_spend": float(market_total_spend / len(unique_ids)) if unique_ids else 0
            }
        }
