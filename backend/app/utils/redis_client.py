"""Redis client for job status management."""

import json
from typing import Dict, Any, Optional
import redis.asyncio as aioredis
from loguru import logger

from app.config import settings


class RedisClient:
    """Async Redis client for managing job statuses."""
    
    def __init__(self):
        self.redis: Optional[aioredis.Redis] = None
    
    async def connect(self):
        """Connect to Redis."""
        try:
            self.redis = await aioredis.from_url(
                settings.redis_url,
                encoding="utf-8",
                decode_responses=True
            )
            logger.info("Connected to Redis")
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}")
            # Continue without Redis - will use in-memory fallback
            self.redis = None
    
    async def disconnect(self):
        """Disconnect from Redis."""
        if self.redis:
            await self.redis.close()
            logger.info("Disconnected from Redis")
    
    async def set_job_status(
        self,
        job_id: str,
        status: Dict[str, Any],
        ttl: int = 3600  # 1 hour
    ):
        """
        Set job status in Redis.
        
        Args:
            job_id: Job identifier
            status: Status dictionary
            ttl: Time to live in seconds
        """
        try:
            if self.redis:
                key = f"job:{job_id}"
                await self.redis.setex(
                    key,
                    ttl,
                    json.dumps(status)
                )
                logger.debug(f"Set status for job {job_id}: {status.get('message', '')}")
            else:
                # Fallback: store in memory (not persistent)
                logger.warning("Redis not connected, status not persisted")
        except Exception as e:
            logger.error(f"Failed to set job status: {e}")
    
    async def get_job_status(self, job_id: str) -> Optional[Dict[str, Any]]:
        """
        Get job status from Redis.
        
        Args:
            job_id: Job identifier
            
        Returns:
            Status dictionary or None if not found
        """
        try:
            if self.redis:
                key = f"job:{job_id}"
                data = await self.redis.get(key)
                
                if data:
                    return json.loads(data)
            
            return None
        except Exception as e:
            logger.error(f"Failed to get job status: {e}")
            return None
    
    async def publish_job_update(self, job_id: str, update: Dict[str, Any]):
        """
        Publish job update to Redis pubsub channel.
        Used for WebSocket real-time updates.
        
        Args:
            job_id: Job identifier
            update: Update data
        """
        try:
            if self.redis:
                channel = f"job_updates:{job_id}"
                await self.redis.publish(
                    channel,
                    json.dumps(update)
                )
        except Exception as e:
            logger.error(f"Failed to publish job update: {e}")
    
    async def subscribe_job_updates(self, job_id: str):
        """
        Subscribe to job updates for WebSocket streaming.
        
        Args:
            job_id: Job identifier
            
        Returns:
            Async iterator of updates
        """
        if not self.redis:
            return
        
        channel = f"job_updates:{job_id}"
        pubsub = self.redis.pubsub()
        
        try:
            await pubsub.subscribe(channel)
            
            async for message in pubsub.listen():
                if message["type"] == "message":
                    data = json.loads(message["data"])
                    yield data
        finally:
            await pubsub.unsubscribe(channel)
            await pubsub.close()


# Global Redis client instance
redis_client = RedisClient()

