"""
Metadata endpoints for AEOS data enrichment.

Provides endpoints for channels, companies, brands, products,
dayparts, EPG categories, and audience profiles.
"""

import asyncio
from fastapi import APIRouter

from api.dependencies import AEOS_AVAILABLE, AEOSClient, AEOSMetadata

router = APIRouter(prefix="/metadata", tags=["Metadata"])


async def _get_client():
    """Get AEOS client in async context."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, AEOSClient)


async def _get_metadata_service():
    """Get AEOS metadata service in async context."""
    client = await _get_client()
    return AEOSMetadata(client)


@router.get("/dayparts", summary="Get Dayparts")
async def get_dayparts():
    """
    Get available dayparts for filtering.
    
    Returns:
        List of daypart objects with id and name
    """
    if not AEOS_AVAILABLE:
        return []
    try:
        metadata = await _get_metadata_service()
        loop = asyncio.get_event_loop()
        dayparts = await loop.run_in_executor(None, metadata.get_dayparts)
        # Normalize response format
        if isinstance(dayparts, list):
            return dayparts
        elif isinstance(dayparts, dict) and "all" in dayparts:
            return dayparts["all"]
        return []
    except Exception as e:
        print(f"Error fetching dayparts: {e}")
        return []


@router.get("/epg-categories", summary="Get EPG Categories")
async def get_epg_categories():
    """
    Get available EPG categories for filtering.
    
    Returns:
        List of EPG category objects with id and name
    """
    if not AEOS_AVAILABLE:
        return []
    try:
        metadata = await _get_metadata_service()
        loop = asyncio.get_event_loop()
        categories = await loop.run_in_executor(None, metadata.get_epg_categories)
        # Normalize response format
        if isinstance(categories, list):
            return categories
        elif isinstance(categories, dict) and "all" in categories:
            return categories["all"]
        return []
    except Exception as e:
        print(f"Error fetching EPG categories: {e}")
        return []


@router.get("/profiles", summary="Get Audience Profiles")
async def get_profiles():
    """
    Get available audience profiles for filtering.
    
    Returns:
        List of profile objects with id and name
    """
    if not AEOS_AVAILABLE:
        return []
    try:
        metadata = await _get_metadata_service()
        loop = asyncio.get_event_loop()
        profiles = await loop.run_in_executor(None, metadata.get_profiles)
        # Normalize response format
        if isinstance(profiles, list):
            return profiles
        elif isinstance(profiles, dict) and "all" in profiles:
            return profiles["all"]
        return []
    except Exception as e:
        print(f"Error fetching profiles: {e}")
        return []


@router.get("/channels", summary="Get Channels")
async def get_channels():
    """
    Get available channels for selection.
    
    Returns:
        List of channel objects with id, name, and metadata
    """
    if not AEOS_AVAILABLE:
        return []
    try:
        client = await _get_client()
        loop = asyncio.get_event_loop()
        # Get all channels (analytics + EPG)
        channels = await loop.run_in_executor(None, lambda: client.load_all_channels())
        # Return all channels from cache
        if channels and "all" in channels:
            return channels["all"]
        elif isinstance(channels, list):
            return channels
        return []
    except Exception as e:
        print(f"Error fetching channels: {e}")
        import traceback
        traceback.print_exc()
        return []


@router.get("/companies", summary="Get Companies")
async def get_companies(filter_text: str = ""):
    """
    Get available companies for selection.
    
    Args:
        filter_text: Optional text filter for company names
        
    Returns:
        List of company objects with id and name
    """
    if not AEOS_AVAILABLE:
        return []
    try:
        metadata = await _get_metadata_service()
        loop = asyncio.get_event_loop()
        # Call get_companies with industry_ids=None and filter_text
        companies = await loop.run_in_executor(
            None, 
            lambda: metadata.get_companies(industry_ids=None, filter_text=filter_text)
        )
        # Normalize response format
        if isinstance(companies, list):
            return companies
        elif isinstance(companies, dict) and "all" in companies:
            return companies["all"]
        return []
    except Exception as e:
        print(f"Error fetching companies: {e}")
        import traceback
        traceback.print_exc()
        return []


@router.get("/brands", summary="Get Brands")
async def get_brands(company_ids: str = "", filter_text: str = ""):
    """
    Get available brands for given company IDs.
    
    Args:
        company_ids: Comma-separated list of company IDs (e.g., "1,2,3")
        filter_text: Optional text filter for brand names
        
    Returns:
        List of brand objects with id, name, and company_id
    """
    if not AEOS_AVAILABLE:
        return []
    try:
        metadata = await _get_metadata_service()
        loop = asyncio.get_event_loop()
        
        # Parse company IDs from comma-separated string
        company_id_list = []
        if company_ids:
            try:
                company_id_list = [int(id.strip()) for id in company_ids.split(',') if id.strip()]
            except ValueError:
                pass
        
        if not company_id_list:
            return []
        
        # Get brands for the specified companies
        brands = await loop.run_in_executor(
            None, 
            lambda: metadata.get_brands(company_id_list, filter_text=filter_text)
        )
        
        # Normalize response format
        if isinstance(brands, list):
            return brands
        elif isinstance(brands, dict) and "all" in brands:
            return brands["all"]
        return []
    except Exception as e:
        print(f"Error fetching brands: {e}")
        import traceback
        traceback.print_exc()
        return []


@router.get("/products", summary="Get Products")
async def get_products(brand_ids: str = "", company_id: str = "", filter_text: str = ""):
    """
    Get available products for given brand IDs or company ID.
    
    Args:
        brand_ids: Comma-separated list of brand IDs (e.g., "1,2,3")
        company_id: Optional company ID - if provided, will fetch all brands for company first
        filter_text: Optional text filter for product names
        
    Returns:
        List of product objects with id, name, and brand_id
    """
    if not AEOS_AVAILABLE:
        return []
    try:
        metadata = await _get_metadata_service()
        loop = asyncio.get_event_loop()
        
        # If company_id is provided, get all brands for that company first
        brand_id_list = []
        if company_id:
            try:
                company_id_int = int(company_id.strip())
                # Get all brands for this company
                brands = await loop.run_in_executor(
                    None,
                    lambda: metadata.get_brands([company_id_int], filter_text="")
                )
                # Extract brand IDs
                if isinstance(brands, list):
                    brand_id_list = [b.get("value") or b.get("id") for b in brands if b.get("value") or b.get("id")]
                elif isinstance(brands, dict) and "all" in brands:
                    brand_id_list = [b.get("value") or b.get("id") for b in brands["all"] if b.get("value") or b.get("id")]
            except (ValueError, Exception) as e:
                print(f"Error fetching brands for company {company_id}: {e}")
                return []
        else:
            # Parse brand IDs from comma-separated string
            if brand_ids:
                try:
                    brand_id_list = [int(id.strip()) for id in brand_ids.split(',') if id.strip()]
                except ValueError:
                    pass
        
        if not brand_id_list:
            return []
        
        # Get products for the specified brands
        products = await loop.run_in_executor(
            None,
            lambda: metadata.get_products(brand_id_list, filter_text=filter_text)
        )
        
        # Normalize response format
        if isinstance(products, list):
            return products
        elif isinstance(products, dict) and "all" in products:
            return products["all"]
        return []
    except Exception as e:
        print(f"Error fetching products: {e}")
        import traceback
        traceback.print_exc()
        return []
