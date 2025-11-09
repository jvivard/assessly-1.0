"""WebSocket endpoints for real-time grading updates."""

from fastapi import WebSocket, WebSocketDisconnect, APIRouter
from loguru import logger
import json
import asyncio

from app.utils.redis_client import redis_client

router = APIRouter()


class ConnectionManager:
    """Manage WebSocket connections."""
    
    def __init__(self):
        self.active_connections: dict[str, list[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, job_id: str):
        """Accept and store WebSocket connection."""
        await websocket.accept()
        
        if job_id not in self.active_connections:
            self.active_connections[job_id] = []
        
        self.active_connections[job_id].append(websocket)
        logger.info(f"WebSocket connected for job {job_id}")
    
    def disconnect(self, websocket: WebSocket, job_id: str):
        """Remove WebSocket connection."""
        if job_id in self.active_connections:
            if websocket in self.active_connections[job_id]:
                self.active_connections[job_id].remove(websocket)
            
            # Clean up empty lists
            if not self.active_connections[job_id]:
                del self.active_connections[job_id]
        
        logger.info(f"WebSocket disconnected for job {job_id}")
    
    async def send_update(self, job_id: str, message: dict):
        """Send update to all connections for a job."""
        if job_id in self.active_connections:
            for connection in self.active_connections[job_id]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.error(f"Failed to send WebSocket message: {e}")


manager = ConnectionManager()


@router.websocket("/ws/grading/{job_id}")
async def websocket_grading_updates(websocket: WebSocket, job_id: str):
    """
    WebSocket endpoint for real-time grading progress.
    
    Streams updates like:
    {
        "status": "processing",
        "progress": 60,
        "message": "Grading question 3/5..."
    }
    """
    await manager.connect(websocket, job_id)
    
    try:
        # Send initial status
        initial_status = await redis_client.get_job_status(job_id)
        if initial_status:
            await websocket.send_json(initial_status)
        else:
            await websocket.send_json({
                "status": "not_found",
                "message": "Job not found or not started yet"
            })
        
        # Keep connection alive and send periodic updates
        while True:
            try:
                # Poll for status updates every second
                await asyncio.sleep(1)
                
                status = await redis_client.get_job_status(job_id)
                if status:
                    await websocket.send_json(status)
                    
                    # Close connection if job is completed or failed
                    if status.get("status") in ["completed", "failed"]:
                        logger.info(f"Job {job_id} finished, closing WebSocket")
                        break
                
            except WebSocketDisconnect:
                logger.info(f"Client disconnected from job {job_id}")
                break
            except Exception as e:
                logger.error(f"Error in WebSocket loop: {e}")
                break
        
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for job {job_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        manager.disconnect(websocket, job_id)


@router.websocket("/ws/grading-stream/{job_id}")
async def websocket_grading_stream(websocket: WebSocket, job_id: str):
    """
    Alternative WebSocket endpoint using Redis pubsub for real-time streaming.
    More efficient for high-frequency updates.
    """
    await manager.connect(websocket, job_id)
    
    try:
        # Subscribe to job updates from Redis
        async for update in redis_client.subscribe_job_updates(job_id):
            await websocket.send_json(update)
            
            # Close if job finished
            if update.get("status") in ["completed", "failed"]:
                break
                
    except WebSocketDisconnect:
        logger.info(f"WebSocket stream disconnected for job {job_id}")
    except Exception as e:
        logger.error(f"WebSocket stream error: {e}")
    finally:
        manager.disconnect(websocket, job_id)

