#!/usr/bin/env python3
"""
异步任务调度器 - 支持优先级、重试、超时、并发限制

关键设计：
- 使用 asyncio.PriorityQueue 实现优先级调度
- 指数退避重试策略，避免雪崩
- 信号量控制并发，保护资源
- 任务状态机追踪生命周期
"""

import asyncio
import logging
import time
import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum, auto
from typing import Dict, Any, Optional, Callable, List, Set, Awaitable
from contextlib import asynccontextmanager
from functools import total_ordering

logger = logging.getLogger('task_scheduler')


# ============== 枚举与常量 ==============

class TaskStatus(Enum):
    """任务状态机"""
    PENDING = auto()      # 等待执行
    RUNNING = auto()      # 执行中
    SUCCESS = auto()      # 成功完成
    FAILED = auto()       # 失败（可重试）
    DEAD = auto()         # 失败（不可重试）
    TIMEOUT = auto()      # 超时
    CANCELLED = auto()    # 被取消


class TaskPriority(Enum):
    """任务优先级"""
    CRITICAL = 0    # 关键任务，立即执行
    HIGH = 1        # 高优先级
    NORMAL = 2      # 普通优先级
    LOW = 3         # 低优先级
    BACKGROUND = 4  # 后台任务


# ============== 异常类 ==============

class TaskSchedulerError(Exception):
    """调度器基础异常"""
    pass


class TaskTimeoutError(TaskSchedulerError):
    """任务超时"""
    pass


class TaskCancelledError(TaskSchedulerError):
    """任务被取消"""
    pass


class TaskDeadError(TaskSchedulerError):
    """任务死亡（重试耗尽）"""
    pass


# ============== 数据模型 ==============

@total_ordering
@dataclass
class Task:
    """
    任务实体
    
    实现 __lt__ 用于 PriorityQueue 排序（值越小优先级越高）
    """
    id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    name: str = "unnamed"
    priority: TaskPriority = TaskPriority.NORMAL
    coro: Callable[[], Awaitable[Any]] = field(default=lambda: asyncio.sleep(0))
    
    # 执行配置
    timeout: Optional[float] = 30.0      # 超时时间（秒），None 表示不限制
    max_retries: int = 3                  # 最大重试次数
    retry_delay_base: float = 1.0         # 退避基数（秒）
    retry_delay_max: float = 60.0         # 最大退避时间
    
    # 状态追踪
    status: TaskStatus = TaskStatus.PENDING
    created_at: float = field(default_factory=time.time)
    started_at: Optional[float] = None
    completed_at: Optional[float] = None
    retry_count: int = 0
    error: Optional[Exception] = None
    result: Any = None
    
    # 内部使用：优先级队列需要可比较
    _seq: int = field(default=0, compare=False)
    
    def __lt__(self, other: 'Task') -> bool:
        """优先级队列排序：优先级数值小的在前，同优先级先进先出"""
        if not isinstance(other, Task):
            return NotImplemented
        return (self.priority.value, self._seq) < (other.priority.value, other._seq)
    
    def __eq__(self, other: object) -> bool:
        if not isinstance(other, Task):
            return NotImplemented
        return self.id == other.id
    
    def __hash__(self) -> int:
        return hash(self.id)
    
    @property
    def duration(self) -> Optional[float]:
        """获取执行耗时"""
        if self.started_at is None:
            return None
        end = self.completed_at or time.time()
        return end - self.started_at
    
    @property
    def wait_time(self) -> float:
        """获取等待时间"""
        start = self.started_at or time.time()
        return start - self.created_at
    
    def to_dict(self) -> Dict[str, Any]:
        """序列化为字典"""
        return {
            'id': self.id,
            'name': self.name,
            'priority': self.priority.name,
            'status': self.status.name,
            'timeout': self.timeout,
            'max_retries': self.max_retries,
            'retry_count': self.retry_count,
            'created_at': datetime.fromtimestamp(self.created_at).isoformat(),
            'started_at': datetime.fromtimestamp(self.started_at).isoformat() if self.started_at else None,
            'completed_at': datetime.fromtimestamp(self.completed_at).isoformat() if self.completed_at else None,
            'duration': self.duration,
            'wait_time': self.wait_time,
            'error': str(self.error) if self.error else None,
        }


@dataclass
class SchedulerStats:
    """调度器统计信息"""
    total_submitted: int = 0
    total_completed: int = 0
    total_failed: int = 0
    total_timeout: int = 0
    total_retried: int = 0
    total_cancelled: int = 0
    active_tasks: int = 0
    pending_tasks: int = 0
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'total_submitted': self.total_submitted,
            'total_completed': self.total_completed,
            'total_failed': self.total_failed,
            'total_timeout': self.total_timeout,
            'total_retried': self.total_retried,
            'total_cancelled': self.total_cancelled,
            'active_tasks': self.active_tasks,
            'pending_tasks': self.pending_tasks,
        }


# ============== 回调接口 ==============

class TaskCallback(ABC):
    """任务生命周期回调接口"""
    
    @abstractmethod
    async def on_submit(self, task: Task) -> None:
        """任务提交时触发"""
        pass
    
    @abstractmethod
    async def on_start(self, task: Task) -> None:
        """任务开始执行时触发"""
        pass
    
    @abstractmethod
    async def on_complete(self, task: Task, result: Any) -> None:
        """任务成功完成时触发"""
        pass
    
    @abstractmethod
    async def on_fail(self, task: Task, error: Exception, will_retry: bool) -> None:
        """任务失败时触发"""
        pass
    
    @abstractmethod
    async def on_cancel(self, task: Task) -> None:
        """任务被取消时触发"""
        pass


class LoggingCallback(TaskCallback):
    """默认日志回调"""
    
    async def on_submit(self, task: Task) -> None:
        logger.debug(f"[Task {task.id}] 已提交 (优先级: {task.priority.name})")
    
    async def on_start(self, task: Task) -> None:
        logger.info(f"[Task {task.id}] 开始执行 ({task.name})")
    
    async def on_complete(self, task: Task, result: Any) -> None:
        logger.info(f"[Task {task.id}] 完成，耗时 {task.duration:.2f}s")
    
    async def on_fail(self, task: Task, error: Exception, will_retry: bool) -> None:
        if will_retry:
            delay = task.retry_delay_base * (2 ** task.retry_count)
            logger.warning(f"[Task {task.id}] 失败: {error}, {delay:.1f}s 后重试 ({task.retry_count}/{task.max_retries})")
        else:
            logger.error(f"[Task {task.id}] 最终失败: {error}")
    
    async def on_cancel(self, task: Task) -> None:
        logger.info(f"[Task {task.id}] 已取消")


# ============== 核心调度器 ==============

class AsyncTaskScheduler:
    """
    异步任务调度器
    
    特性：
    - 优先级队列调度
    - 指数退避重试
    - 超时控制
    - 并发限制
    - 优雅关闭
    - 状态追踪与统计
    """
    
    def __init__(
        self,
        max_concurrent: int = 10,
        callbacks: Optional[List[TaskCallback]] = None,
        shutdown_timeout: float = 30.0
    ):
        self.max_concurrent = max_concurrent
        self.shutdown_timeout = shutdown_timeout
        self.callbacks = callbacks or [LoggingCallback()]
        
        # 核心组件
        self._queue: asyncio.PriorityQueue[Task] = asyncio.PriorityQueue()
        self._semaphore = asyncio.Semaphore(max_concurrent)
        self._tasks: Dict[str, Task] = {}           # 所有任务
        self._running: Set[asyncio.Task] = set()     # 正在执行的 asyncio.Task
        self._cancelled_ids: Set[str] = set()        # 被取消的任务ID
        
        # 统计
        self._stats = SchedulerStats()
        self._seq_counter = 0
        
        # 控制
        self._started = False
        self._shutdown_event = asyncio.Event()
        self._worker_task: Optional[asyncio.Task] = None
        self._lock = asyncio.Lock()
    
    async def start(self) -> None:
        """启动调度器"""
        if self._started:
            return
        
        self._started = True
        self._shutdown_event.clear()
        self._worker_task = asyncio.create_task(self._worker_loop())
        logger.info(f"调度器已启动 (最大并发: {self.max_concurrent})")
    
    async def stop(self, wait: bool = True) -> None:
        """
        停止调度器
        
        Args:
            wait: 是否等待正在执行的任务完成
        """
        if not self._started:
            return
        
        logger.info("调度器正在停止...")
        self._started = False
        self._shutdown_event.set()
        
        # 取消所有等待中的任务
        while not self._queue.empty():
            try:
                task = self._queue.get_nowait()
                async with self._lock:
                    task.status = TaskStatus.CANCELLED
                    self._stats.total_cancelled += 1
                    await self._emit('on_cancel', task)
            except asyncio.QueueEmpty:
                break
        
        # 取消所有正在执行的任务
        for asyncio_task in list(self._running):
            asyncio_task.cancel()
        
        # 等待 worker 结束
        if self._worker_task:
            try:
                await asyncio.wait_for(self._worker_task, timeout=self.shutdown_timeout)
            except asyncio.TimeoutError:
                logger.warning("调度器关闭超时，强制结束")
            except asyncio.CancelledError:
                pass
        
        # 等待运行中的任务完成（可选）
        if wait and self._running:
            await asyncio.gather(*self._running, return_exceptions=True)
        
        logger.info("调度器已停止")
    
    async def submit(
        self,
        coro: Callable[[], Awaitable[Any]],
        name: str = "unnamed",
        priority: TaskPriority = TaskPriority.NORMAL,
        timeout: Optional[float] = 30.0,
        max_retries: int = 3,
        retry_delay_base: float = 1.0,
        retry_delay_max: float = 60.0,
    ) -> Task:
        """
        提交任务
        
        Args:
            coro: 异步协程函数
            name: 任务名称
            priority: 优先级
            timeout: 超时时间（秒）
            max_retries: 最大重试次数
            
        Returns:
            Task 对象
        """
        if not self._started:
            raise TaskSchedulerError("调度器未启动")
        
        self._seq_counter += 1
        task = Task(
            name=name,
            priority=priority,
            coro=coro,
            timeout=timeout,
            max_retries=max_retries,
            retry_delay_base=retry_delay_base,
            retry_delay_max=retry_delay_max,
            _seq=self._seq_counter
        )
        
        async with self._lock:
            self._tasks[task.id] = task
            self._stats.total_submitted += 1
            self._stats.pending_tasks = self._queue.qsize() + 1
        
        await self._queue.put(task)
        await self._emit('on_submit', task)
        
        return task
    
    async def cancel(self, task_id: str) -> bool:
        """取消指定任务"""
        async with self._lock:
            if task_id in self._cancelled_ids:
                return True
            
            task = self._tasks.get(task_id)
            if not task:
                return False
            
            if task.status == TaskStatus.PENDING:
                # 标记为取消，worker 执行时会跳过
                self._cancelled_ids.add(task_id)
                return True
            elif task.status == TaskStatus.RUNNING:
                # 取消运行中的 asyncio.Task
                for asyncio_task in self._running:
                    # 这里简化处理，实际应该维护 task_id -> asyncio.Task 的映射
                    pass
                return True
            
            return False
    
    async def get_task(self, task_id: str) -> Optional[Task]:
        """获取任务信息"""
        async with self._lock:
            return self._tasks.get(task_id)
    
    async def list_tasks(
        self,
        status: Optional[TaskStatus] = None,
        limit: int = 100
    ) -> List[Task]:
        """列出任务"""
        async with self._lock:
            tasks = list(self._tasks.values())
        
        if status:
            tasks = [t for t in tasks if t.status == status]
        
        # 按创建时间倒序
        tasks.sort(key=lambda t: t.created_at, reverse=True)
        return tasks[:limit]
    
    def get_stats(self) -> SchedulerStats:
        """获取统计信息"""
        return SchedulerStats(
            total_submitted=self._stats.total_submitted,
            total_completed=self._stats.total_completed,
            total_failed=self._stats.total_failed,
            total_timeout=self._stats.total_timeout,
            total_retried=self._stats.total_retried,
            total_cancelled=self._stats.total_cancelled,
            active_tasks=len(self._running),
            pending_tasks=self._queue.qsize()
        )
    
    # ============== 内部方法 ==============
    
    async def _worker_loop(self) -> None:
        """工作主循环"""
        while not self._shutdown_event.is_set():
            try:
                # 等待任务，带超时以便检查关闭信号
                task = await asyncio.wait_for(
                    self._queue.get(),
                    timeout=1.0
                )
            except asyncio.TimeoutError:
                continue
            
            # 检查是否被取消
            if task.id in self._cancelled_ids:
                async with self._lock:
                    task.status = TaskStatus.CANCELLED
                    self._stats.total_cancelled += 1
                    self._cancelled_ids.discard(task.id)
                await self._emit('on_cancel', task)
                self._queue.task_done()
                continue
            
            # 使用信号量控制并发
            asyncio.create_task(self._execute_with_semaphore(task))
    
    async def _execute_with_semaphore(self, task: Task) -> None:
        """在信号量控制下执行任务"""
        async with self._semaphore:
            asyncio_task = asyncio.create_task(self._execute_task(task))
            self._running.add(asyncio_task)
            try:
                await asyncio_task
            finally:
                self._running.discard(asyncio_task)
                self._queue.task_done()
    
    async def _execute_task(self, task: Task) -> None:
        """执行单个任务"""
        task.status = TaskStatus.RUNNING
        task.started_at = time.time()
        
        async with self._lock:
            self._stats.active_tasks = len(self._running)
        
        await self._emit('on_start', task)
        
        try:
            # 执行协程，带超时
            if task.timeout:
                result = await asyncio.wait_for(
                    task.coro(),
                    timeout=task.timeout
                )
            else:
                result = await task.coro()
            
            # 成功
            task.result = result
            task.status = TaskStatus.SUCCESS
            task.completed_at = time.time()
            
            async with self._lock:
                self._stats.total_completed += 1
            
            await self._emit('on_complete', task, result)
            
        except asyncio.TimeoutError:
            await self._handle_timeout(task)
        except asyncio.CancelledError:
            task.status = TaskStatus.CANCELLED
            task.completed_at = time.time()
            raise
        except Exception as e:
            await self._handle_error(task, e)
    
    async def _handle_timeout(self, task: Task) -> None:
        """处理超时"""
        task.status = TaskStatus.TIMEOUT
        task.error = TaskTimeoutError(f"任务执行超过 {task.timeout} 秒")
        task.completed_at = time.time()
        
        async with self._lock:
            self._stats.total_timeout += 1
        
        await self._emit('on_fail', task, task.error, False)
    
    async def _handle_error(self, task: Task, error: Exception) -> None:
        """处理错误，决定是否重试"""
        task.error = error
        task.completed_at = time.time()
        
        # 判断是否可以重试
        can_retry = (
            task.retry_count < task.max_retries and
            not isinstance(error, TaskDeadError) and
            not isinstance(error, TaskCancelledError)
        )
        
        if can_retry:
            task.retry_count += 1
            task.status = TaskStatus.FAILED
            
            async with self._lock:
                self._stats.total_retried += 1
            
            await self._emit('on_fail', task, error, True)
            
            # 计算退避延迟
            delay = min(
                task.retry_delay_base * (2 ** (task.retry_count - 1)),
                task.retry_delay_max
            )
            
            # 重新放入队列
            await asyncio.sleep(delay)
            task.status = TaskStatus.PENDING
            task.started_at = None
            task.completed_at = None
            task.error = None
            await self._queue.put(task)
        else:
            task.status = TaskStatus.DEAD
            
            async with self._lock:
                self._stats.total_failed += 1
            
            await self._emit('on_fail', task, error, False)
    
    async def _emit(self, event: str, *args, **kwargs) -> None:
        """触发回调"""
        for callback in self.callbacks:
            try:
                method = getattr(callback, event)
                await method(*args, **kwargs)
            except Exception as e:
                logger.error(f"回调 {event} 执行失败: {e}")


# ============== 装饰器工具 ==============

def scheduled(
    scheduler: AsyncTaskScheduler,
    priority: TaskPriority = TaskPriority.NORMAL,
    timeout: Optional[float] = 30.0,
    max_retries: int = 3
):
    """将函数注册为可调度的任务装饰器"""
    def decorator(func: Callable[..., Awaitable[Any]]):
        async def wrapper(*args, **kwargs) -> Task:
            async def coro():
                return await func(*args, **kwargs)
            
            return await scheduler.submit(
                coro,
                name=func.__name__,
                priority=priority,
                timeout=timeout,
                max_retries=max_retries
            )
        
        wrapper._original = func
        return wrapper
    return decorator


# ============== 使用示例 ==============

async def demo():
    """演示如何使用调度器"""
    # 配置日志
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # 创建调度器
    scheduler = AsyncTaskScheduler(
        max_concurrent=3,
        shutdown_timeout=10.0
    )
    
    await scheduler.start()
    
    # 模拟 API 调用的异步函数
    async def fetch_data(url: str, should_fail: bool = False) -> dict:
        await asyncio.sleep(1)  # 模拟网络延迟
        if should_fail:
            raise ConnectionError(f"无法连接到 {url}")
        return {"url": url, "data": "some data"}
    
    async def long_task() -> str:
        await asyncio.sleep(5)
        return "completed"
    
    # 提交各种优先级的任务
    tasks = []
    
    # 关键任务
    for i in range(2):
        task = await scheduler.submit(
            lambda i=i: fetch_data(f"https://api.example.com/critical/{i}"),
            name=f"critical_task_{i}",
            priority=TaskPriority.CRITICAL,
            timeout=2.0
        )
        tasks.append(task)
    
    # 普通任务（其中一个会失败触发重试）
    task = await scheduler.submit(
        lambda: fetch_data("https://api.example.com/data", should_fail=True),
        name="failing_task",
        priority=TaskPriority.NORMAL,
        max_retries=2,
        retry_delay_base=0.5
    )
    tasks.append(task)
    
    # 超时任务
    task = await scheduler.submit(
        long_task,
        name="timeout_task",
        priority=TaskPriority.LOW,
        timeout=2.0  # 会超时
    )
    tasks.append(task)
    
    # 后台任务
    for i in range(3):
        task = await scheduler.submit(
            lambda i=i: fetch_data(f"https://api.example.com/background/{i}"),
            name=f"background_{i}",
            priority=TaskPriority.BACKGROUND
        )
        tasks.append(task)
    
    # 等待所有任务处理完成
    await asyncio.sleep(8)
    
    # 打印统计
    stats = scheduler.get_stats()
    print("\n=== 调度器统计 ===")
    for key, value in stats.to_dict().items():
        print(f"  {key}: {value}")
    
    # 打印任务详情
    print("\n=== 任务详情 ===")
    for task in await scheduler.list_tasks(limit=20):
        status_icon = {
            TaskStatus.SUCCESS: "✓",
            TaskStatus.DEAD: "✗",
            TaskStatus.TIMEOUT: "⏱",
            TaskStatus.CANCELLED: "⊘"
        }.get(task.status, "?")
        print(f"  [{status_icon}] {task.name} ({task.priority.name}): {task.status.name}")
        if task.duration:
            print(f"      耗时: {task.duration:.2f}s, 等待: {task.wait_time:.2f}s")
        if task.error:
            print(f"      错误: {task.error}")
    
    await scheduler.stop(wait=True)


if __name__ == "__main__":
    asyncio.run(demo())
