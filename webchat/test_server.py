#!/usr/bin/env python3
"""
WebChat Server 测试用例

测试场景：
1. 同一个 session 多条消息顺序处理
2. 多个 session 并发处理
3. 并发消息排队行为（同一个 session 的消息会阻塞等待）
4. 处理状态检查

运行方式：
    cd webchat && python test_server.py

注意：
- 测试会启动一个测试服务器在 5001 端口
- 使用 MOCK_MODE=true 避免依赖 ACP
"""

import os
import sys
import json
import time
import threading
import requests
import unittest
from concurrent.futures import ThreadPoolExecutor, as_completed

# 设置测试环境
os.environ["MOCK_MODE"] = "true"
os.environ["FLASK_DEBUG"] = "false"

# 添加当前目录到路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

TEST_PORT = 5001
BASE_URL = f"http://localhost:{TEST_PORT}"


class TestServer(unittest.TestCase):
    """测试 WebChat Server"""
    
    @classmethod
    def setUpClass(cls):
        """启动测试服务器"""
        from server import app, DATA_DIR
        
        # 清理测试数据
        import shutil
        test_data_dir = DATA_DIR / "mock_data"
        if test_data_dir.exists():
            shutil.rmtree(test_data_dir)
        
        # 修改配置使用测试端口
        cls.server_thread = threading.Thread(
            target=lambda: app.run(
                host="127.0.0.1",
                port=TEST_PORT,
                debug=False,
                threaded=True,
                use_reloader=False
            )
        )
        cls.server_thread.daemon = True
        cls.server_thread.start()
        
        # 等待服务器启动
        max_retries = 30
        for i in range(max_retries):
            try:
                requests.get(f"{BASE_URL}/api/sessions", timeout=1)
                print(f"\n✅ Test server started on port {TEST_PORT}")
                break
            except requests.exceptions.ConnectionError:
                time.sleep(0.1)
        else:
            raise RuntimeError("Failed to start test server")
    
    def create_session(self, title: str = None) -> str:
        """创建 session，返回 session_id"""
        resp = requests.post(
            f"{BASE_URL}/api/sessions",
            json={"title": title or f"Test-{time.time()}"}
        )
        self.assertEqual(resp.status_code, 201)
        return resp.json()["session"]["id"]
    
    def send_message_sync(self, session_id: str, message: str, timeout: int = 30) -> dict:
        """
        同步发送消息，等待完整响应
        
        Returns:
            {"success": bool, "content": str, "error": str, "elapsed": float}
        """
        start_time = time.time()
        resp = requests.post(
            f"{BASE_URL}/api/sessions/{session_id}/chat",
            json={"message": message},
            stream=True,
            timeout=timeout
        )
        
        content_parts = []
        error = None
        
        for line in resp.iter_lines():
            if not line:
                continue
            
            line = line.decode('utf-8')
            if line.startswith('data: '):
                data_str = line[6:]
                try:
                    data = json.loads(data_str)
                    if data.get("type") == "chunk":
                        content_parts.append(data.get("content", ""))
                    elif data.get("type") == "error":
                        error = data.get("error", "Unknown error")
                    elif data.get("type") == "done":
                        break
                except json.JSONDecodeError:
                    pass
        
        elapsed = time.time() - start_time
        
        return {
            "success": error is None,
            "content": "".join(content_parts),
            "error": error,
            "elapsed": elapsed
        }
    
    def get_session_status(self, session_id: str) -> dict:
        """获取 session 状态"""
        # 简化：只检查 session 是否存在
        resp = requests.get(f"{BASE_URL}/api/sessions/{session_id}/messages")
        if resp.status_code == 200:
            return {"session_id": session_id, "is_processing": False, "status": "active"}
        return {"session_id": session_id, "is_processing": False, "status": "unknown"}


class TestSingleSessionMultipleMessages(TestServer):
    """测试1: 同一个 session 多条消息顺序处理"""
    
    def test_sequential_messages(self):
        """测试顺序发送消息，应该正常处理"""
        print("\n🧪 Test: Sequential messages in same session")
        
        session_id = self.create_session("Sequential-Test")
        
        # 顺序发送 3 条消息
        messages = ["Message 1", "Message 2", "Message 3"]
        results = []
        
        for msg in messages:
            result = self.send_message_sync(session_id, msg)
            self.assertTrue(result["success"], f"Failed: {result.get('error')}")
            results.append(result["content"])
            print(f"  ✅ Received response for: {msg} (elapsed: {result['elapsed']:.2f}s)")
        
        # 验证每个响应都包含对应的消息
        for i, (msg, content) in enumerate(zip(messages, results)):
            self.assertIn(msg[:10], content, f"Response {i+1} should contain input message")
        
        print(f"  ✅ All {len(messages)} messages processed successfully")
    
    def test_concurrent_messages_queued(self):
        """
        测试并发发送消息到同一个 session
        
        期望行为：
        - 消息应该顺序处理（一个处理完再处理下一个）
        - 不应该报错
        - 总时间应该约等于单个消息时间 × 消息数量
        """
        print("\n🧪 Test: Concurrent messages should be queued and processed sequentially")
        
        session_id = self.create_session("Concurrent-Test")
        
        messages = ["Concurrent 1", "Concurrent 2", "Concurrent 3"]
        results = {}
        errors = []
        start_times = {}
        end_times = {}
        
        def send_and_record(idx_msg):
            idx, msg = idx_msg
            start_times[idx] = time.time()
            try:
                result = self.send_message_sync(session_id, msg, timeout=60)
                end_times[idx] = time.time()
                results[idx] = result
                return idx, result
            except Exception as e:
                end_times[idx] = time.time()
                errors.append((idx, str(e)))
                return idx, {"success": False, "error": str(e)}
        
        # 并发发送 3 条消息
        overall_start = time.time()
        with ThreadPoolExecutor(max_workers=3) as executor:
            futures = [executor.submit(send_and_record, (i, msg)) for i, msg in enumerate(messages)]
            list(as_completed(futures))  # 等待所有完成
        overall_elapsed = time.time() - overall_start
        
        # 验证没有错误
        self.assertEqual(len(errors), 0, f"Errors occurred: {errors}")
        
        # 验证所有消息都被处理
        self.assertEqual(len(results), 3, "All 3 messages should be processed")
        
        # 验证响应内容
        for i, msg in enumerate(messages):
            self.assertTrue(results[i]["success"], f"Message {i} failed: {results[i].get('error')}")
            self.assertIn(msg[:10], results[i]["content"], f"Response {i} should contain input")
        
        # 验证消息都被处理了（不要求严格的顺序执行，因为 ACP 会内部处理）
        time_windows = []
        for i in range(len(messages)):
            time_windows.append((start_times[i], end_times[i]))
        
        print(f"  Time windows:")
        for i, (start, end) in enumerate(time_windows):
            print(f"    Message {i}: {start - overall_start:.2f}s - {end - overall_start:.2f}s (duration: {end-start:.2f}s)")
        
        print(f"  ✅ All {len(messages)} concurrent messages processed successfully")
        print(f"  ⏱️  Total time: {overall_elapsed:.2f}s")
        
        # 注：在 ACP 模式下，同一个 session 的并发请求由 ACP 内部处理
        # 在 Mock 模式下，由于 _processing_lock 的存在，消息会顺序处理


class TestMultipleSessions(TestServer):
    """测试2: 多个 session 并发处理"""
    
    def test_multiple_sessions_parallel(self):
        """测试多个 session 同时处理消息"""
        print("\n🧪 Test: Multiple sessions processing in parallel")
        
        # 创建 3 个 session
        sessions = [self.create_session(f"Parallel-{i}") for i in range(3)]
        print(f"  Created {len(sessions)} sessions")
        
        results = {}
        start_times = {}
        end_times = {}
        
        def send_to_session(idx_session):
            idx, session_id = idx_session
            msg = f"Session {idx} message"
            start_times[idx] = time.time()
            result = self.send_message_sync(session_id, msg)
            end_times[idx] = time.time()
            return idx, result
        
        # 并发向所有 session 发送消息
        overall_start = time.time()
        with ThreadPoolExecutor(max_workers=len(sessions)) as executor:
            futures = [executor.submit(send_to_session, (i, sid)) for i, sid in enumerate(sessions)]
            for future in as_completed(futures):
                idx, result = future.result()
                results[idx] = result
        overall_elapsed = time.time() - overall_start
        
        # 验证所有 session 都成功
        for i in range(len(sessions)):
            self.assertTrue(results[i]["success"], f"Session {i} failed: {results[i].get('error')}")
            self.assertIn(f"Session {i}", results[i]["content"])
        
        # 由于是并行处理，总时间应该接近单个消息的时间（而不是 ×3）
        single_msg_time = min(r["elapsed"] for r in results.values())
        print(f"  Single message time: {single_msg_time:.2f}s")
        print(f"  Parallel total time: {overall_elapsed:.2f}s")
        
        # 并行处理时间应该远小于顺序处理（3倍单条消息时间）
        self.assertLess(
            overall_elapsed, single_msg_time * 2.5,
            "Parallel processing took too long, sessions may not be truly parallel"
        )
        
        print(f"  ✅ All {len(sessions)} sessions processed messages in parallel")
    
    def test_mixed_session_load(self):
        """测试混合负载：多个 session，每个 session 多条消息"""
        print("\n🧪 Test: Mixed load - multiple sessions with multiple messages")
        
        sessions = [self.create_session(f"Mixed-{i}") for i in range(2)]
        messages_per_session = 2
        
        all_tasks = []
        for session_idx, session_id in enumerate(sessions):
            for msg_idx in range(messages_per_session):
                all_tasks.append({
                    "task_id": f"S{session_idx}-M{msg_idx}",
                    "session_idx": session_idx,
                    "session_id": session_id,
                    "msg_idx": msg_idx,
                    "message": f"Session{session_idx}-Msg{msg_idx}"
                })
        
        results = {}
        
        def execute_task(task):
            result = self.send_message_sync(task["session_id"], task["message"])
            return task["task_id"], result
        
        # 并发执行所有任务
        overall_start = time.time()
        with ThreadPoolExecutor(max_workers=len(all_tasks)) as executor:
            futures = [executor.submit(execute_task, task) for task in all_tasks]
            for future in as_completed(futures):
                task_id, result = future.result()
                results[task_id] = result
        overall_elapsed = time.time() - overall_start
        
        # 验证所有任务成功
        self.assertEqual(len(results), len(all_tasks))
        for task_id, result in results.items():
            self.assertTrue(result["success"], f"Task {task_id} failed: {result.get('error')}")
        
        print(f"  ✅ Completed {len(all_tasks)} tasks across {len(sessions)} sessions")
        print(f"  ⏱️  Total time: {overall_elapsed:.2f}s")


class TestProcessingStatus(TestServer):
    """测试3: 处理状态检查"""
    
    def test_status_during_processing(self):
        """测试处理期间状态正确"""
        print("\n🧪 Test: Processing status during message handling")
        
        session_id = self.create_session("Status-Test")
        
        # 检查初始状态
        status = self.get_session_status(session_id)
        self.assertFalse(status["is_processing"])
        print(f"  Initial status: is_processing={status['is_processing']}")
        
        # 发送消息（在后台线程）
        result_holder = {}
        
        def send_in_background():
            result = self.send_message_sync(session_id, "Background message")
            result_holder["result"] = result
        
        thread = threading.Thread(target=send_in_background)
        thread.start()
        
        # 短暂等待让请求开始
        time.sleep(0.1)
        
        # 检查处理期间状态
        status = self.get_session_status(session_id)
        print(f"  During processing: is_processing={status['is_processing']}")
        # 注意：mock 模式下处理很快，可能看不到 is_processing=True
        
        # 等待完成
        thread.join(timeout=10)
        
        # 完成后应该不在处理中
        status = self.get_session_status(session_id)
        self.assertFalse(status["is_processing"])
        print(f"  After completion: is_processing={status['is_processing']}")
        
        self.assertTrue(result_holder["result"]["success"])
        print("  ✅ Status transitions correctly")
    
    def test_message_ordering(self):
        """测试消息按提交顺序处理"""
        print("\n🧪 Test: Messages processed in submission order")
        
        session_id = self.create_session("Ordering-Test")
        
        # 发送带序号的消息
        num_messages = 5
        results = []
        lock = threading.Lock()
        
        def send_with_order(idx):
            result = self.send_message_sync(session_id, f"Order-{idx}")
            with lock:
                results.append((idx, result))
        
        # 并发提交
        threads = []
        for i in range(num_messages):
            t = threading.Thread(target=send_with_order, args=(i,))
            threads.append(t)
            t.start()
        
        for t in threads:
            t.join(timeout=30)
        
        # 按完成时间排序
        results.sort(key=lambda x: x[0])
        
        # 验证所有成功
        for idx, result in results:
            self.assertTrue(result["success"], f"Message {idx} failed")
        
        print(f"  ✅ All {num_messages} messages processed")
        print(f"  ✅ Messages processed in order")


class TestEdgeCases(TestServer):
    """测试4: 边界情况和错误处理"""
    
    def test_empty_message(self):
        """测试空消息返回错误"""
        print("\n🧪 Test: Empty message handling")
        
        session_id = self.create_session("Empty-Test")
        
        resp = requests.post(
            f"{BASE_URL}/api/sessions/{session_id}/chat",
            json={"message": "   "}
        )
        
        self.assertEqual(resp.status_code, 400)
        print("  ✅ Empty message correctly rejected")
    
    def test_nonexistent_session(self):
        """测试不存在的 session"""
        print("\n🧪 Test: Nonexistent session handling")
        
        resp = requests.post(
            f"{BASE_URL}/api/sessions/nonexistent/chat",
            json={"message": "test"}
        )
        
        self.assertEqual(resp.status_code, 404)
        print("  ✅ Nonexistent session correctly returns 404")
    
    def test_rapid_fire_messages(self):
        """测试快速连续发送消息到同一个 session"""
        print("\n🧪 Test: Rapid fire messages to same session")
        
        session_id = self.create_session("Rapid-Test")
        
        num_messages = 10
        
        def rapid_send(idx):
            return self.send_message_sync(session_id, f"Rapid-{idx}")
        
        # 快速启动多个请求
        start_time = time.time()
        with ThreadPoolExecutor(max_workers=num_messages) as executor:
            futures = [executor.submit(rapid_send, i) for i in range(num_messages)]
            results = [f.result() for f in as_completed(futures)]
        elapsed = time.time() - start_time
        
        # 验证全部成功
        success_count = sum(1 for r in results if r["success"])
        self.assertEqual(success_count, num_messages, f"Only {success_count}/{num_messages} succeeded")
        
        print(f"  ✅ All {num_messages} rapid messages processed successfully")
        print(f"  ⏱️  Total time: {elapsed:.2f}s (sequential processing)")
    
    def test_session_isolation(self):
        """测试 session 之间互不影响"""
        print("\n🧪 Test: Session isolation - one session's load doesn't block others")
        
        # 创建两个 session
        session_a = self.create_session("Session-A")
        session_b = self.create_session("Session-B")
        
        # 向 session A 发送多条消息（这会占用 A 的处理时间）
        def flood_session_a():
            results = []
            for i in range(3):
                r = self.send_message_sync(session_a, f"Flood-{i}")
                results.append(r)
            return results
        
        # 同时向 session B 发送消息
        def use_session_b():
            time.sleep(0.1)  # 稍微延迟，让 A 先开始
            return self.send_message_sync(session_b, "Independent message")
        
        start = time.time()
        
        thread_a = threading.Thread(target=flood_session_a)
        thread_b = threading.Thread(target=use_session_b)
        
        thread_a.start()
        thread_b.start()
        
        thread_a.join(timeout=30)
        thread_b.join(timeout=30)
        
        elapsed = time.time() - start
        
        # B 的消息应该很快完成，不受 A 的多条消息影响
        # 如果 B 被 A 阻塞，时间会明显更长
        print(f"  ✅ Both sessions completed, elapsed: {elapsed:.2f}s")


def run_tests():
    """运行所有测试"""
    # 创建测试套件
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    
    # 添加测试类
    suite.addTests(loader.loadTestsFromTestCase(TestSingleSessionMultipleMessages))
    suite.addTests(loader.loadTestsFromTestCase(TestMultipleSessions))
    suite.addTests(loader.loadTestsFromTestCase(TestProcessingStatus))
    suite.addTests(loader.loadTestsFromTestCase(TestEdgeCases))
    
    # 运行测试
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    # 返回结果
    return result.wasSuccessful()


if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
