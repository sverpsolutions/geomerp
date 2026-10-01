import asyncio
import logging
from datetime import datetime
from sqlalchemy import select
from app.core.database import async_session_factory
from app.models.outlet import outlet
from app.routers.sync import sync_stock

logger = logging.getLogger("scheduler")

async def stock_sync_task():
    """Background task to sync stock for all connected outlets."""
    logger.info("Stock sync scheduler started")
    while True:
        try:
            now = datetime.now()
            # Check time window: 8 AM (8) to 11 PM (23)
            if 8 <= now.hour <= 23:
                logger.info(f"Starting scheduled stock sync at {now}")
                
                async with async_session_factory() as db:
                    # Get all connected outlets
                    result = await db.execute(select(outlet).where(outlet.is_connected == True))
                    outlets = result.scalars().all()
                    
                    for s in outlets:
                        try:
                            logger.info(f"Auto-syncing stock for outlet: {s.outlet_name} (ID: {s.id})")
                            # We call the sync_stock function directly
                            await sync_stock(id=s.id, db=db)
                        except Exception as e:
                            logger.error(f"Error syncing stock for outlet {s.id}: {e}")
                
                logger.info("Scheduled stock sync cycle completed")
            else:
                logger.debug(f"Outside sync window (8 AM - 11 PM). Current hour: {now.hour}")

        except Exception as e:
            logger.error(f"Critical error in stock sync scheduler: {e}")
        
        # Sleep for 1 hour (3600 seconds)
        await asyncio.sleep(3600)

def start_scheduler():
    asyncio.create_task(stock_sync_task())
