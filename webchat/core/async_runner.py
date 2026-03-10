#!/usr/bin/env python3
"""
Async Runner for Session
"""

import asyncio
import threading
import time
import logging
from queue import Queue
from typing import Optional, Any, Callable

logger = logging.getLogger('webchat')


class SessionAsyncRunner:
    """
    为每个 Session 提供专用的事件循环线程
    解决跨线程 event loop 问题
    """
    def __init__(self, session_id: str):
        self.session_id = session_id
        self._loop: Optional[asyncio.AbstractEventLoop] = None
        self._thread: Optional[threading.Thread] = None
        self._lock = threading.Lock()
        self._initialized = False
        self._stop_event = threading.Event()
        logger.debug(f"[{session_id}] AsyncRunner created")
    
    def start(self):
        """启动事件循环线程"""
        with self._lock:
            if self._thread is not None and self._thread.is_alive():
                return
            
            self._stop_event.clear()
            self._thread = threading.Thread(target=self._run_loop, name=f"Session-{self.session_id}")
            self._thread.daemon = True
            self._thread.start()
            
            # 等待 loop 准备好
            while self._loop is None:
                time.sleep(0.001)
            
            logger.info(f"[{self.session_id}] AsyncRunner started")
    
    def _run_loop(self):
        """在专用线程中运行事件循环"""
        self._loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self._loop)
        
        # 运行直到被停止
        while not self._stop_event.is_set():
            try:
                self._loop.run_forever()
            except Exception as e:
                logger.exception(f"[{self.session_id}] Event loop error")
        
        # 清理
        pending = asyncio.all_tasks(self._loop)
        for task in pending:
            task.cancel()
        
        if pending:
            self._loop.run_until_complete(asyncio.gather(*pending, return_exceptions=True))
        
        self._loop.close()
        logger.info(f"[{self.session_id}] AsyncRunner stopped")
    
    def run(self, coro: Callable[[], Any]) -> Any:
        """
        在 session 的 event loop 中运行异步函数
        如果还没启动，先启动
        """
        self.start()
        
        # 创建 Future 来接收结果
        result_queue = Queue()
        
        def run_coro():
            try:
                future = asyncio.ensure_future(coro())
                
                def on_done(fut):
                    try:
                        result_queue.put(('result', fut.result()))
                    except Exception as e:
                        result_queue.put(('error', e))
                
                future.add_done_callback(on_done)
            except Exception as e:
                result_queue.put(('error', e))
        
        # 在 event loop 线程中调度
        self._loop.call_soon_threadsafe(run_coro)
        
        # 等待结果
        status, value = result_queue.get()
        if status == 'error':
            raise value
        return value
    
    def run_sync(self, coro: Callable[[], Any], timeout: Optional[float] = None) -> Any:
        """同步等待异步函数完成"""
        self.start()
        
        # 使用 run_coroutine_threadsafe 在线程安全的 loop 中运行
        future = asyncio.run_coroutine_threadsafe(coro(), self._loop)
        return future.result(timeout=timeout)
    
    def stop(self):
        """停止事件循环"""
        self._stop_event.set()
        if self._loop:
            self._loop.call_soon_threadsafe(self._loop.stop)
        if self._thread:
            self._thread.join(timeout=5)
