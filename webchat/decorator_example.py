"""
Python 装饰器类示例
展示了常见的装饰器用法
"""

from functools import wraps
from typing import Callable


# ==================== 1. 内置装饰器示例 ====================

class BuiltInDecorators:
    """展示 Python 内置的装饰器用法"""
    
    def __init__(self, value: int):
        self._value = value
    
    @property
    def value(self) -> int:
        """属性装饰器 - 像访问属性一样访问方法"""
        return self._value
    
    @value.setter
    def value(self, new_value: int):
        """属性设置器"""
        if new_value < 0:
            raise ValueError("值不能为负数")
        self._value = new_value
    
    @staticmethod
    def static_method(x: int, y: int) -> int:
        """静态方法 - 不需要 self 参数"""
        return x + y
    
    @classmethod
    def class_method(cls, name: str):
        """类方法 - 第一个参数是类本身"""
        instance = cls(0)
        instance.name = name
        return instance


# ==================== 2. 自定义方法装饰器 ====================

def timer_decorator(func: Callable) -> Callable:
    """计时装饰器 - 计算方法执行时间"""
    @wraps(func)
    def wrapper(*args, **kwargs):
        import time
        start = time.time()
        result = func(*args, **kwargs)
        elapsed = time.time() - start
        print(f"⏱️  {func.__name__} 执行耗时: {elapsed:.4f} 秒")
        return result
    return wrapper


def log_call(func: Callable) -> Callable:
    """日志装饰器 - 记录方法调用"""
    @wraps(func)
    def wrapper(*args, **kwargs):
        print(f"📞 调用 {func.__name__}，参数: args={args[1:]}, kwargs={kwargs}")
        result = func(*args, **kwargs)
        print(f"✅ {func.__name__} 返回: {result}")
        return result
    return wrapper


def retry(max_attempts: int = 3):
    """重试装饰器 - 失败时自动重试"""
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(1, max_attempts + 1):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    print(f"⚠️  第 {attempt}/{max_attempts} 次尝试失败: {e}")
                    if attempt == max_attempts:
                        raise
        return wrapper
    return decorator


class Calculator:
    """使用自定义装饰器的计算器类"""
    
    def __init__(self):
        self.history = []
    
    @log_call
    @timer_decorator
    def add(self, a: float, b: float) -> float:
        """加法 - 带日志和计时"""
        import time
        time.sleep(0.1)  # 模拟耗时操作
        result = a + b
        self.history.append(f"add({a}, {b}) = {result}")
        return result
    
    @log_call
    def divide(self, a: float, b: float) -> float:
        """除法 - 带日志"""
        if b == 0:
            raise ValueError("除数不能为0")
        result = a / b
        self.history.append(f"divide({a}, {b}) = {result}")
        return result
    
    @retry(max_attempts=3)
    def risky_operation(self, should_fail: bool = False):
        """可能失败的操作 - 带重试机制"""
        if should_fail:
            raise RuntimeError("操作失败！")
        return "操作成功！"


# ==================== 3. 类装饰器 ====================

def singleton(cls: type) -> type:
    """单例装饰器 - 确保类只有一个实例"""
    instances = {}
    @wraps(cls)
    def wrapper(*args, **kwargs):
        if cls not in instances:
            instances[cls] = cls(*args, **kwargs)
        return instances[cls]
    return wrapper


def add_method(method_name: str, func: Callable):
    """动态添加方法的类装饰器"""
    def decorator(cls: type) -> type:
        setattr(cls, method_name, func)
        return cls
    return decorator


def auto_repr(cls: type) -> type:
    """自动生成 __repr__ 方法的装饰器"""
    def __repr__(self):
        attrs = ', '.join(f"{k}={v!r}" for k, v in self.__dict__.items())
        return f"{self.__class__.__name__}({attrs})"
    cls.__repr__ = __repr__
    return cls


@singleton
@auto_repr
class Database:
    """单例数据库连接类"""
    
    def __init__(self, connection_string: str):
        self.connection_string = connection_string
        self.is_connected = False
    
    def connect(self):
        self.is_connected = True
        print(f"🔗 已连接到: {self.connection_string}")


# ==================== 4. 带状态装饰器的类 ====================

class CountCalls:
    """统计方法调用次数的装饰器类"""
    
    def __init__(self, func: Callable):
        wraps(func)(self)
        self.func = func
        self.count = 0
    
    def __call__(self, *args, **kwargs):
        self.count += 1
        print(f"🔢 {self.func.__name__} 被调用了 {self.count} 次")
        return self.func(*args, **kwargs)
    
    def __get__(self, instance, owner):
        """支持绑定到实例"""
        from functools import partial
        return partial(self.__call__, instance)


class Counter:
    """使用方法调用计数装饰器的类"""
    
    @CountCalls
    def say_hello(self, name: str):
        print(f"Hello, {name}!")
    
    @CountCalls
    def say_goodbye(self, name: str):
        print(f"Goodbye, {name}!")


# ==================== 测试代码 ====================

def main():
    print("=" * 50)
    print("1. 内置装饰器示例")
    print("=" * 50)
    
    obj = BuiltInDecorators(100)
    print(f"value 属性: {obj.value}")
    obj.value = 200
    print(f"修改后: {obj.value}")
    
    result = BuiltInDecorators.static_method(10, 20)
    print(f"静态方法结果: {result}")
    
    new_obj = BuiltInDecorators.class_method("测试实例")
    print(f"类方法创建: {new_obj.name}")
    
    print("\n" + "=" * 50)
    print("2. 自定义装饰器示例")
    print("=" * 50)
    
    calc = Calculator()
    calc.add(10, 20)
    calc.divide(100, 5)
    
    print("\n尝试重试机制:")
    try:
        calc.risky_operation(should_fail=True)
    except RuntimeError:
        print("最终失败")
    
    result = calc.risky_operation(should_fail=False)
    print(result)
    
    print("\n" + "=" * 50)
    print("3. 类装饰器示例")
    print("=" * 50)
    
    db1 = Database("postgresql://localhost/mydb")
    db2 = Database("mysql://localhost/otherdb")
    
    print(f"db1 is db2: {db1 is db2}")  # True，因为是单例
    print(f"数据库实例: {db1}")
    db1.connect()
    
    print("\n" + "=" * 50)
    print("4. 调用计数装饰器")
    print("=" * 50)
    
    counter = Counter()
    counter.say_hello("Alice")
    counter.say_hello("Bob")
    counter.say_goodbye("Alice")


if __name__ == "__main__":
    main()
